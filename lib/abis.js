export const SMALLBETTING_ABI = [
  "function marketCount() view returns (uint256)",
  "function flatFee() view returns (uint256)",
  "function maxEntry() view returns (uint256)",
  "function winnerFeeBps() view returns (uint256)",
  "function marketCreator() view returns (address)",
  "function resolver() view returns (address)",
  "function marketIdBySlugHash(bytes32) view returns (uint256)",
  "function markets(uint256) view returns (string slug, string title, string optionA, string optionB, uint64 closeTime, uint64 resolveTime, uint8 result, bool resolved, uint256 totalA, uint256 totalB, uint32 uniqueBettors)",
  "function positions(uint256,address) view returns (uint256 amountA, uint256 amountB, bool claimed)",
  "function createMarket(string slug, string title, string optionA, string optionB, uint64 closeTime, uint64 resolveTime) returns (uint256)",
  "function resolveMarket(uint256 marketId, uint8 result)",
  "function enter(uint256 marketId, uint8 side, uint256 amount)",
  "function claim(uint256 marketId)",
  "function previewClaim(uint256 marketId, address user) view returns (uint256 payout, uint256 fee)",
  "event Entered(uint256 indexed marketId, address indexed user, uint8 side, uint256 amount, uint256 flatFee)",
  "event MarketCreated(uint256 indexed marketId, string slug, string title, string optionA, string optionB, uint64 closeTime, uint64 resolveTime)",
  "event Resolved(uint256 indexed marketId, uint8 result)"
];

export const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
