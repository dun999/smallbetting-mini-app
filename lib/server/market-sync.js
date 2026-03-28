import { ethers } from "ethers";
import { BTC_MARKET_KEY, LEAGUES } from "../config.js";
import { getBitcoinRange, getNextBitcoinWindow, getMatchResult, getNextLeagueMatch } from "./live-data.js";
import { getContract, getMarketIdBySlug, getOwnerWallet, readAllMarkets } from "./contract.js";

export function parseMarketKind(slug) {
  if (slug.startsWith("btc-")) return BTC_MARKET_KEY;
  if (slug.startsWith("epl-")) return "epl";
  if (slug.startsWith("laliga-")) return "laliga";
  if (slug.startsWith("ucl-")) return "ucl";
  return "unknown";
}

export function parseBitcoinSlug(slug) {
  const match = slug.match(/^btc-(\d+)-(\d+)$/);
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
}

export function parseFootballSlug(slug) {
  const match = slug.match(/^(epl|laliga|ucl)-(.+)$/);
  if (!match) return null;
  return { leagueKey: match[1], eventId: match[2] };
}

function buildBitcoinDraft(now = Math.floor(Date.now() / 1000)) {
  const window = getNextBitcoinWindow(now);
  return {
    key: BTC_MARKET_KEY,
    slug: `btc-${window.start}-${window.end}`,
    title: `BTC ${new Date(window.start * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })} -> ${new Date(window.end * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })} UTC`,
    optionA: "Up",
    optionB: "Down",
    closeTime: window.closeTime,
    resolveTime: window.resolveTime,
    source: { start: window.start, end: window.end }
  };
}

async function buildFootballDraft(leagueKey) {
  const match = await getNextLeagueMatch(leagueKey);
  if (!match) return null;
  return {
    key: leagueKey,
    slug: `${leagueKey}-${match.id}`,
    title: `${LEAGUES[leagueKey].label}: ${match.homeTeam} vs ${match.awayTeam}`,
    optionA: match.homeTeam,
    optionB: match.awayTeam,
    closeTime: match.kickoffUnix,
    resolveTime: match.kickoffUnix + 3 * 60 * 60,
    source: match
  };
}

export async function buildDesiredMarkets() {
  const drafts = [buildBitcoinDraft()];
  for (const leagueKey of Object.keys(LEAGUES)) drafts.push(buildFootballDraft(leagueKey));
  return (await Promise.all(drafts)).filter(Boolean);
}

export async function syncLiveMarkets() {
  const wallet = getOwnerWallet();
  const contract = getContract(wallet);
  const desired = await buildDesiredMarkets();
  const created = [];
  const skipped = [];

  for (const draft of desired) {
    const existingId = await getMarketIdBySlug(draft.slug);
    if (existingId > 0) {
      skipped.push({ slug: draft.slug, reason: "slug exists", marketId: existingId });
      continue;
    }

    const tx = await contract.createMarket(
      draft.slug,
      draft.title,
      draft.optionA,
      draft.optionB,
      draft.closeTime,
      draft.resolveTime
    );
    const receipt = await tx.wait();
    created.push({ slug: draft.slug, txHash: receipt.hash });
  }

  return { created, skipped, desiredCount: desired.length };
}

async function decideBitcoinResult(market) {
  const slug = parseBitcoinSlug(market.slug);
  if (!slug) return 3;
  const prices = await getBitcoinRange(slug.start, slug.end);
  if (prices.length < 2) return 3;
  const open = prices[0].price;
  const close = prices[prices.length - 1].price;
  if (close === open) return 3;
  return close > open ? 1 : 2;
}

async function decideFootballResult(market) {
  const parsed = parseFootballSlug(market.slug);
  if (!parsed) return 3;
  const result = await getMatchResult(parsed.leagueKey, parsed.eventId);
  if (!result.completed) return null;
  if (result.homeScore === result.awayScore) return 3;
  return result.homeScore > result.awayScore ? 1 : 2;
}

export async function reconcileMarkets() {
  const wallet = getOwnerWallet();
  const contract = getContract(wallet);
  const markets = (await readAllMarkets()).filter((market) => !market.resolved);
  const actions = [];
  const errors = [];
  const now = Math.floor(Date.now() / 1000);

  for (const market of markets) {
    try {
      // Skip markets that are still inside their configured settlement delay.
      if (market.resolveTime > now) {
        continue;
      }

      const hasAgainst = market.totalA > 0n && market.totalB > 0n;

      // A market is void when it does not have enough real participation or only one-sided liquidity.
      if (market.uniqueBettors < 2 || !hasAgainst) {
        const tx = await contract.resolveMarket(market.marketId, 3);
        const receipt = await tx.wait();
        actions.push({ marketId: market.marketId, slug: market.slug, resolution: "void", txHash: receipt.hash });
        continue;
      }

      let result = null;
      const kind = parseMarketKind(market.slug);
      if (kind === BTC_MARKET_KEY) result = await decideBitcoinResult(market);
      else if (kind in LEAGUES) result = await decideFootballResult(market);
      if (result === null) continue;

      const tx = await contract.resolveMarket(market.marketId, result);
      const receipt = await tx.wait();
      actions.push({ marketId: market.marketId, slug: market.slug, resolution: result, txHash: receipt.hash });
    } catch (error) {
      // One failing market must not stop the rest of the reconciliation batch.
      errors.push({ marketId: market.marketId, slug: market.slug, error: error.message || String(error) });
    }
  }

  return { actions, errors };
}

export function formatUsdc(value) {
  return Number(ethers.formatUnits(value, 6));
}
