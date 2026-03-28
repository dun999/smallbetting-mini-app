export const APP_NAME = "Smallbetting";
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_HEX = "0x2105";
export const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_SMALLBETTING_CONTRACT ||
  "0x8c535227Ed2B2963a3c1176510BC59e7A7fEF07D";
export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_BASE_USDC ||
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
export const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "";

export const FLAT_FEE_USDC = 0.01;
export const MAX_ENTRY_USDC = 5;

export const LEAGUES = {
  epl: {
    key: "epl",
    label: "Premier League",
    espnSlug: "eng.1",
    accent: "#7ef0c6"
  },
  laliga: {
    key: "laliga",
    label: "LaLiga",
    espnSlug: "esp.1",
    accent: "#ffc857"
  },
  ucl: {
    key: "ucl",
    label: "UEFA Champions League",
    espnSlug: "uefa.champions",
    accent: "#7bb2ff"
  }
};

export const BTC_MARKET_KEY = "btc";
export const BTC_MARKET_DURATION_SECONDS = 10 * 60;
