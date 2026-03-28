import fs from "fs";
import path from "path";
import { ethers, id } from "ethers";
import { SMALLBETTING_ABI } from "../abis.js";
import { BASE_RPC_URL, CONTRACT_ADDRESS } from "../config.js";

let provider;

export function getReadProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  }
  return provider;
}

export function getContract(signerOrProvider = getReadProvider()) {
  return new ethers.Contract(CONTRACT_ADDRESS, SMALLBETTING_ABI, signerOrProvider);
}

export function getOwnerWallet() {
  const envKey = process.env.OWNER_PRIVATE_KEY?.trim();
  const keyPath = path.join(process.cwd(), "key.txt");
  const fileKey = fs.existsSync(keyPath) ? fs.readFileSync(keyPath, "utf8").trim() : "";
  const privateKey = envKey || fileKey;

  if (!privateKey) {
    throw new Error("OWNER_PRIVATE_KEY or key.txt is required for admin operations.");
  }

  return new ethers.Wallet(privateKey, getReadProvider());
}

export async function getContractConfig() {
  const contract = getContract();
  const [flatFee, maxEntry, winnerFeeBps, marketCount, marketCreator, resolver] = await Promise.all([
    contract.flatFee(),
    contract.maxEntry(),
    contract.winnerFeeBps(),
    contract.marketCount(),
    contract.marketCreator(),
    contract.resolver()
  ]);

  return {
    flatFee,
    maxEntry,
    winnerFeeBps,
    marketCount: Number(marketCount),
    marketCreator,
    resolver
  };
}

export function slugHash(slug) {
  return id(slug);
}

export async function getMarketIdBySlug(slug) {
  const contract = getContract();
  const marketId = await contract.marketIdBySlugHash(slugHash(slug));
  return Number(marketId);
}

export function normalizeMarket(marketId, raw) {
  return {
    marketId,
    slug: raw.slug,
    title: raw.title,
    optionA: raw.optionA,
    optionB: raw.optionB,
    closeTime: Number(raw.closeTime),
    resolveTime: Number(raw.resolveTime),
    result: Number(raw.result),
    resolved: raw.resolved,
    totalA: raw.totalA,
    totalB: raw.totalB,
    uniqueBettors: Number(raw.uniqueBettors)
  };
}

export async function readAllMarkets() {
  const contract = getContract();
  const total = Number(await contract.marketCount());
  const markets = await Promise.all(
    Array.from({ length: total }, async (_, index) => {
      const marketId = index + 1;
      const raw = await contract.markets(marketId);
      return normalizeMarket(marketId, raw);
    })
  );

  return markets;
}

export async function getPosition(marketId, address) {
  const contract = getContract();
  const raw = await contract.positions(marketId, address);
  return {
    amountA: raw.amountA,
    amountB: raw.amountB,
    claimed: raw.claimed
  };
}

export async function getPreviewClaim(marketId, address) {
  const contract = getContract();
  const raw = await contract.previewClaim(marketId, address);
  return {
    payout: raw[0],
    fee: raw[1]
  };
}
