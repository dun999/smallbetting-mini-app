import { formatUnits } from "ethers";
import { BTC_MARKET_KEY, FLAT_FEE_USDC, LEAGUES, MAX_ENTRY_USDC } from "../config.js";
import { getBitcoinChart, getBitcoinTicker } from "./live-data.js";
import { buildDesiredMarkets } from "./market-sync.js";
import { getContractConfig, getMarketIdBySlug, readAllMarkets } from "./contract.js";

function formatPool(totalA, totalB) {
  return Number(formatUnits(totalA + totalB, 6));
}

function formatAmount(value) {
  return Number(formatUnits(value, 6));
}

function describeStatus(market) {
  const now = Date.now() / 1000;
  if (market.resolved) return "resolved";
  if (market.closeTime <= now) return "locked";
  return "open";
}

export async function getMarketDashboard() {
  const [onchainMarkets, desiredMarkets, contractConfig, btcTicker, btcChart] = await Promise.all([
    readAllMarkets(),
    buildDesiredMarkets(),
    getContractConfig(),
    getBitcoinTicker(),
    getBitcoinChart()
  ]);

  const marketMap = new Map(onchainMarkets.map((market) => [market.slug, market]));
  const desiredByKey = Object.fromEntries(desiredMarkets.map((draft) => [draft.key, draft]));
  const keys = [BTC_MARKET_KEY, ...Object.keys(LEAGUES)];

  const cards = await Promise.all(
    keys.map(async (key) => {
      const draft = desiredByKey[key] || {
        key,
        title: key === BTC_MARKET_KEY ? "Next BTC 10-minute market" : `${LEAGUES[key].label} market`,
        optionA: key === BTC_MARKET_KEY ? "Up" : "Home",
        optionB: key === BTC_MARKET_KEY ? "Down" : "Away",
        closeTime: Math.floor(Date.now() / 1000),
        resolveTime: Math.floor(Date.now() / 1000),
        source: null,
        slug: null
      };

      const exactMarket = draft.slug ? marketMap.get(draft.slug) || null : null;
      const market = exactMarket
        ? {
            marketId: exactMarket.marketId,
            slug: exactMarket.slug,
            title: exactMarket.title,
            optionA: exactMarket.optionA,
            optionB: exactMarket.optionB,
            closeTime: exactMarket.closeTime,
            resolveTime: exactMarket.resolveTime,
            result: exactMarket.result,
            resolved: exactMarket.resolved,
            uniqueBettors: exactMarket.uniqueBettors,
            poolUsd: formatPool(exactMarket.totalA, exactMarket.totalB),
            totalAUsd: formatAmount(exactMarket.totalA),
            totalBUsd: formatAmount(exactMarket.totalB),
            participants: exactMarket.uniqueBettors,
            status: describeStatus(exactMarket)
          }
        : null;

      return {
        kind: key,
        label: key === BTC_MARKET_KEY ? "Bitcoin" : LEAGUES[key].label,
        accent: key === BTC_MARKET_KEY ? "#ff8f5a" : LEAGUES[key].accent,
        live: draft.source,
        draft,
        market,
        exactMarketId: draft.slug ? await getMarketIdBySlug(draft.slug) : 0
      };
    })
  );

  return {
    generatedAt: new Date().toISOString(),
    limits: {
      flatFeeUsdc: FLAT_FEE_USDC,
      maxEntryUsdc: MAX_ENTRY_USDC,
      contractFlatFeeRaw: contractConfig.flatFee.toString(),
      contractMaxEntryRaw: contractConfig.maxEntry.toString(),
      winnerFeeBps: Number(contractConfig.winnerFeeBps),
      marketCreator: contractConfig.marketCreator,
      resolver: contractConfig.resolver
    },
    btc: {
      ticker: btcTicker,
      chart: btcChart
    },
    cards
  };
}
