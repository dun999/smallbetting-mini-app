// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract SmallBetting {
    uint8 public constant SIDE_A = 1;
    uint8 public constant SIDE_B = 2;
    uint8 public constant RESULT_VOID = 3;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    struct Market {
        string slug;
        string title;
        string optionA;
        string optionB;
        uint64 closeTime;
        uint64 resolveTime;
        uint8 result;
        bool resolved;
        uint256 totalA;
        uint256 totalB;
        uint32 uniqueBettors;
    }

    struct Position {
        uint256 amountA;
        uint256 amountB;
        bool claimed;
    }

    IERC20 public immutable usdc;
    address public owner;
    address public marketCreator;
    address public resolver;
    address public treasury;
    uint256 public flatFee;
    uint256 public winnerFeeBps;
    uint256 public maxEntry;
    bool public paused;
    uint256 public marketCount;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    // Prevent duplicate business identifiers from creating multiple markets for the same slot.
    mapping(bytes32 => uint256) public marketIdBySlugHash;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TreasuryUpdated(address indexed treasury);
    event MarketCreatorUpdated(address indexed marketCreator);
    event ResolverUpdated(address indexed resolver);
    event FeesUpdated(uint256 flatFee, uint256 winnerFeeBps, uint256 maxEntry);
    event PausedSet(bool paused);
    event MarketCreated(
        uint256 indexed marketId,
        string slug,
        string title,
        string optionA,
        string optionB,
        uint64 closeTime,
        uint64 resolveTime
    );
    event Entered(uint256 indexed marketId, address indexed user, uint8 side, uint256 amount, uint256 flatFee);
    event Resolved(uint256 indexed marketId, uint8 result);
    event Claimed(uint256 indexed marketId, address indexed user, uint256 payout, uint256 fee);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyMarketCreator() {
        require(msg.sender == owner || msg.sender == marketCreator, "not market creator");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == owner || msg.sender == resolver, "not resolver");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    constructor(address usdc_, address treasury_, uint256 flatFee_, uint256 winnerFeeBps_, uint256 maxEntry_) {
        require(usdc_ != address(0), "usdc zero");
        require(treasury_ != address(0), "treasury zero");
        require(winnerFeeBps_ < BPS_DENOMINATOR, "fee too high");
        usdc = IERC20(usdc_);
        owner = msg.sender;
        marketCreator = msg.sender;
        resolver = msg.sender;
        treasury = treasury_;
        flatFee = flatFee_;
        winnerFeeBps = winnerFeeBps_;
        maxEntry = maxEntry_;
        emit OwnershipTransferred(address(0), msg.sender);
        emit MarketCreatorUpdated(msg.sender);
        emit ResolverUpdated(msg.sender);
        emit TreasuryUpdated(treasury_);
        emit FeesUpdated(flatFee_, winnerFeeBps_, maxEntry_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "owner zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "treasury zero");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setMarketCreator(address newMarketCreator) external onlyOwner {
        require(newMarketCreator != address(0), "market creator zero");
        marketCreator = newMarketCreator;
        emit MarketCreatorUpdated(newMarketCreator);
    }

    function setResolver(address newResolver) external onlyOwner {
        require(newResolver != address(0), "resolver zero");
        resolver = newResolver;
        emit ResolverUpdated(newResolver);
    }

    function setFees(uint256 newFlatFee, uint256 newWinnerFeeBps, uint256 newMaxEntry) external onlyOwner {
        require(newWinnerFeeBps < BPS_DENOMINATOR, "fee too high");
        flatFee = newFlatFee;
        winnerFeeBps = newWinnerFeeBps;
        maxEntry = newMaxEntry;
        emit FeesUpdated(newFlatFee, newWinnerFeeBps, newMaxEntry);
    }

    function setPaused(bool newPaused) external onlyOwner {
        paused = newPaused;
        emit PausedSet(newPaused);
    }

    function createMarket(
        string calldata slug,
        string calldata title,
        string calldata optionA,
        string calldata optionB,
        uint64 closeTime,
        uint64 resolveTime
    ) external onlyMarketCreator returns (uint256 marketId) {
        require(bytes(slug).length > 0, "slug empty");
        require(bytes(title).length > 0, "title empty");
        require(bytes(optionA).length > 0, "optionA empty");
        require(bytes(optionB).length > 0, "optionB empty");
        require(closeTime > block.timestamp, "close in past");
        require(resolveTime >= closeTime, "resolve before close");

        // The slug is the canonical identifier shared by the contract, backend, and frontend.
        bytes32 slugHash = keccak256(bytes(slug));
        require(marketIdBySlugHash[slugHash] == 0, "slug exists");

        marketId = ++marketCount;
        markets[marketId] = Market({
            slug: slug,
            title: title,
            optionA: optionA,
            optionB: optionB,
            closeTime: closeTime,
            resolveTime: resolveTime,
            result: 0,
            resolved: false,
            totalA: 0,
            totalB: 0,
            uniqueBettors: 0
        });
        marketIdBySlugHash[slugHash] = marketId;

        emit MarketCreated(marketId, slug, title, optionA, optionB, closeTime, resolveTime);
    }

    function enter(uint256 marketId, uint8 side, uint256 amount) external whenNotPaused {
        Market storage market = markets[marketId];
        require(bytes(market.slug).length > 0, "market missing");
        require(!market.resolved, "market resolved");
        require(block.timestamp < market.closeTime, "market closed");
        require(side == SIDE_A || side == SIDE_B, "bad side");
        require(amount > 0 && amount <= maxEntry, "bad amount");

        // The exposure cap is enforced against the bettor's total position in one market.
        Position storage position = positions[marketId][msg.sender];
        uint256 previousExposure = position.amountA + position.amountB;
        require(previousExposure + amount <= maxEntry, "market exposure exceeded");

        uint256 totalDebit = amount + flatFee;
        require(usdc.transferFrom(msg.sender, address(this), amount), "stake transfer failed");
        require(usdc.transferFrom(msg.sender, treasury, flatFee), "fee transfer failed");

        // Unique bettors are tracked onchain so void logic does not depend on log indexing.
        if (previousExposure == 0) {
            market.uniqueBettors += 1;
        }

        if (side == SIDE_A) {
            position.amountA += amount;
            market.totalA += amount;
        } else {
            position.amountB += amount;
            market.totalB += amount;
        }

        emit Entered(marketId, msg.sender, side, amount, totalDebit - amount);
    }

    function resolveMarket(uint256 marketId, uint8 result) external onlyResolver {
        Market storage market = markets[marketId];
        require(bytes(market.slug).length > 0, "market missing");
        require(!market.resolved, "already resolved");
        require(result == SIDE_A || result == SIDE_B || result == RESULT_VOID, "bad result");
        // Resolution is delayed until resolveTime so offchain data can become final first.
        require(block.timestamp >= market.resolveTime, "too early");

        market.resolved = true;
        market.result = result;
        emit Resolved(marketId, result);
    }

    function claim(uint256 marketId) external {
        Market storage market = markets[marketId];
        Position storage position = positions[marketId][msg.sender];
        require(market.resolved, "not resolved");
        require(!position.claimed, "already claimed");

        uint256 amountA = position.amountA;
        uint256 amountB = position.amountB;
        require(amountA > 0 || amountB > 0, "no position");

        position.claimed = true;

        uint256 payout;
        uint256 fee;

        // A void market returns original stake. A winning market returns stake plus
        // proportional share of the losing pool, minus the configured winner fee.
        if (market.result == RESULT_VOID) {
            payout = amountA + amountB;
        } else if (market.result == SIDE_A) {
            require(amountA > 0, "losing side");
            payout = _computeGrossPayout(amountA, market.totalA, market.totalB);
        } else {
            require(amountB > 0, "losing side");
            payout = _computeGrossPayout(amountB, market.totalB, market.totalA);
        }

        if (market.result != RESULT_VOID) {
            fee = (payout * winnerFeeBps) / BPS_DENOMINATOR;
            payout -= fee;
        }

        if (fee > 0) {
            require(usdc.transfer(treasury, fee), "fee payout failed");
        }
        require(usdc.transfer(msg.sender, payout), "claim transfer failed");

        emit Claimed(marketId, msg.sender, payout, fee);
    }

    function previewClaim(uint256 marketId, address user) external view returns (uint256 payout, uint256 fee) {
        Market storage market = markets[marketId];
        Position storage position = positions[marketId][user];

        if (!market.resolved || position.claimed) {
            return (0, 0);
        }

        if (market.result == RESULT_VOID) {
            return (position.amountA + position.amountB, 0);
        }

        if (market.result == SIDE_A && position.amountA > 0) {
            payout = _computeGrossPayout(position.amountA, market.totalA, market.totalB);
        } else if (market.result == SIDE_B && position.amountB > 0) {
            payout = _computeGrossPayout(position.amountB, market.totalB, market.totalA);
        } else {
            return (0, 0);
        }

        fee = (payout * winnerFeeBps) / BPS_DENOMINATOR;
        payout -= fee;
    }

    function _computeGrossPayout(uint256 winnerStake, uint256 totalWinnerStake, uint256 totalLoserStake)
        internal
        pure
        returns (uint256)
    {
        require(totalWinnerStake > 0, "no winners");
        return winnerStake + ((winnerStake * totalLoserStake) / totalWinnerStake);
    }
}
