# Smallbetting

Smallbetting is a Base-native Farcaster Mini App for micro prediction markets. It supports a rolling Bitcoin market and three football verticals: Premier League, LaLiga, and UEFA Champions League.

The project includes:

- A hardened Solidity market contract on Base
- A Next.js Mini App frontend for Farcaster
- Server routes that fetch live market data
- Admin endpoints and scripts for market creation and settlement

## Core Product Rules

- Every market uses USDC on Base
- The flat platform fee is `$0.01` per entry
- The winner fee is `1.5%` of each winning payout
- Maximum exposure is `$5` per wallet per market
- Bitcoin markets run on a `10 minute` window
- Football markets are created from the next official fixture for:
  - Premier League
  - LaLiga
  - UEFA Champions League
- A market is void if:
  - Fewer than 2 unique bettors joined
  - One side has zero stake at settlement time
  - The data source cannot produce a valid result
- Users claim payouts or refunds manually from the contract

## Cashout and Claim Rules

Smallbetting currently supports claim-based cashout after settlement, not early cashout before the event is finished.

What this means:

- If you win a resolved market, you can claim your payout
- If a market is void, you can claim your refund
- You cannot exit early before the market is resolved
- There is no secondary market or instant sell-back mechanism in the current version

This is an intentional design choice for the MVP because it keeps the protocol simpler and avoids introducing additional liquidity or market-maker requirements.

## How It Works

### Market Creation

The backend generates a canonical market slug for each live opportunity.

Examples:

- `btc-<start>-<end>`
- `epl-<eventId>`
- `laliga-<eventId>`
- `ucl-<eventId>`

These slugs are used across:

- contract storage
- backend sync logic
- frontend market selection

Slug uniqueness is enforced onchain, so the same market cannot be created twice.

### Betting Flow

1. The frontend loads the current live market candidates.
2. The frontend only enables betting if there is an exact onchain market for the current live slot.
3. The user approves USDC if needed.
4. The user places a bet on side A or side B.
5. The contract enforces that total exposure in the market does not exceed `$5`.

### Settlement Flow

1. The resolver waits until `resolveTime`.
2. If there are fewer than 2 unique bettors, the market is void.
3. If one side has no stake, the market is void.
4. Otherwise:
   - Bitcoin markets use the live BTC price window
   - Football markets use the official match result
5. Users call `claim()` to withdraw winnings or refunds.

## Live Data Sources

The app does not use mock data.

- Bitcoin data: CoinGecko
- Football fixtures and scores: ESPN
- Onchain state: Base RPC + the deployed contract

## Smart Contract Design

Main file:

- [contracts/SmallBetting.sol](/D:/ideGPT/contracts/SmallBetting.sol)

Key properties:

- `owner`: top-level admin
- `marketCreator`: allowed to create markets
- `resolver`: allowed to settle markets
- `treasury`: receives fees
- `marketIdBySlugHash`: prevents duplicate slugs
- `uniqueBettors`: stored onchain for reliable participation checks

Important protections:

- per-market exposure cap
- unique market enforcement
- delayed resolution
- separate operational roles
- manual claim pattern for payouts and refunds

## Backend and Server Logic

Main files:

- [lib/server/live-data.js](/D:/ideGPT/lib/server/live-data.js)
- [lib/server/market-sync.js](/D:/ideGPT/lib/server/market-sync.js)
- [lib/server/market-view.js](/D:/ideGPT/lib/server/market-view.js)
- [lib/server/contract.js](/D:/ideGPT/lib/server/contract.js)

Responsibilities:

- generate current candidate markets
- create missing markets
- resolve or void finished markets
- expose dashboard data for the Mini App
- fetch user positions and claim previews

Security-oriented behavior:

- exact market matching only
- no fallback binding to stale markets
- isolated reconcile errors so one bad market does not stop the batch
- no expensive participant log scans during dashboard rendering

## Frontend Mini App

Main file:

- [components/mini-app-shell.jsx](/D:/ideGPT/components/mini-app-shell.jsx)

Features:

- Farcaster Mini App compatibility
- browser wallet fallback for local testing
- live BTC chart
- live football fixture cards
- exact active market targeting
- claim preview display
- disabled betting when no exact live market exists
- FAQ section for user rules and market behavior

## API Routes

- `/api/markets`
  - Returns dashboard data, limits, live BTC chart, and current market cards
- `/api/positions`
  - Returns user exposure and claim preview for a market
- `/api/admin/sync-markets`
  - Creates any missing live markets
- `/api/admin/reconcile`
  - Resolves or voids matured markets
- `/.well-known/farcaster.json`
  - Farcaster Mini App manifest
- `/api/share-image`
  - Open Graph and Mini App image

## Local Development

Install dependencies:

```bash
npm install
```

Compile the contract artifact:

```bash
npm run compile
```

Run the app in development:

```bash
npm run dev
```

Build production output:

```bash
npm run build
```

Run the production server:

```bash
npm run start
```

## Environment Variables

Recommended variables:

```env
NEXT_PUBLIC_APP_URL=https://your-public-domain.example
NEXT_PUBLIC_SMALLBETTING_CONTRACT=0x...
BASE_RPC_URL=https://base-rpc.publicnode.com
TREASURY_ADDRESS=0x...
ADMIN_SECRET=change-me
OWNER_PRIVATE_KEY=optional-if-not-using-key-txt
```

Notes:

- `key.txt` is supported for local admin operations, but should never be committed
- `NEXT_PUBLIC_APP_URL` must point to a public HTTPS URL for real Farcaster testing
- `ADMIN_SECRET` protects admin API routes

## Deployment Checklist

1. Deploy the hardened contract to Base Mainnet
2. Set the contract address in environment variables
3. Deploy the app to a public HTTPS host
4. Update `NEXT_PUBLIC_APP_URL`
5. Confirm `/.well-known/farcaster.json` is publicly reachable
6. Run market sync
7. Configure recurring reconcile and sync jobs
8. Test the launch flow inside Farcaster

## Operational Recommendations

- Move `owner` to a multisig such as Safe
- Use a dedicated resolver key instead of the owner key for day-to-day settlement
- Monitor failed reconcile runs
- Rotate RPC providers if one starts rate-limiting reads
- Keep market sync and reconcile jobs on a schedule

## Important Note About Contract Versions

The hardened contract version is required for the security fixes described in this repository.

If you previously deployed an older contract version, the frontend must be pointed to the new contract address. The old address does not inherit these fixes automatically.
