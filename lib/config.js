const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  || "http://localhost:3000";

const inferredAppUrl = rawAppUrl.replace(/\/+$/, "");

export const APP_NAME = "Smallbetting";
export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_HEX = "0x2105";
export const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://base-rpc.publicnode.com";
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_SMALLBETTING_CONTRACT ||
  "0x8e05a4B45f421C5e99669501FFc7488e96BD66c4";
export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_BASE_USDC ||
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const APP_URL = inferredAppUrl;
export const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
export const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "";

export const FLAT_FEE_USDC = 0.01;
export const MAX_ENTRY_USDC = 5;

export const LEAGUES = {
  epl: {
    key: "epl",
    label: "Premier League",
    espnSlug: "eng.1",
    accent: "#86e0bb"
  },
  laliga: {
    key: "laliga",
    label: "LaLiga",
    espnSlug: "esp.1",
    accent: "#f3c35f"
  },
  ucl: {
    key: "ucl",
    label: "UEFA Champions League",
    espnSlug: "uefa.champions",
    accent: "#8eb6ff"
  }
};

export const BTC_MARKET_KEY = "btc";
export const BTC_MARKET_DURATION_SECONDS = 10 * 60;
