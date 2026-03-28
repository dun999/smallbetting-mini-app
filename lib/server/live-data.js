import { BTC_MARKET_DURATION_SECONDS, LEAGUES } from "../config.js";

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function toEspnDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

async function fetchJson(url, init = {}, revalidate = 30) {
  const response = await fetch(url, {
    ...init,
    next: {
      revalidate
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }

  return response.json();
}

export async function getBitcoinTicker() {
  const json = await fetchJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
    {},
    20
  );

  return {
    priceUsd: json.bitcoin?.usd ?? null,
    change24h: json.bitcoin?.usd_24h_change ?? null
  };
}

export async function getBitcoinChart() {
  const json = await fetchJson(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1",
    {},
    20
  );

  return (json.prices || []).slice(-72).map(([timestamp, price]) => ({
    timestamp,
    price: Number(price.toFixed(2)),
    label: new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }));
}

export async function getBitcoinRange(fromUnix, toUnix) {
  const from = Math.max(0, Math.floor(fromUnix));
  const to = Math.max(from + 60, Math.floor(toUnix));
  const json = await fetchJson(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
    {},
    15
  );

  return (json.prices || []).map(([timestamp, price]) => ({
    timestamp,
    price
  }));
}

function normalizeEspnEvent(event, leagueKey) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((entry) => entry.homeAway === "home");
  const away = competitors.find((entry) => entry.homeAway === "away");

  return {
    id: event.id,
    leagueKey,
    leagueLabel: LEAGUES[leagueKey].label,
    title: event.name,
    kickoff: event.date,
    kickoffUnix: Math.floor(new Date(event.date).getTime() / 1000),
    status: event.status?.type?.state || "pre",
    completed: Boolean(event.status?.type?.completed),
    homeTeam: home?.team?.displayName || "Home",
    awayTeam: away?.team?.displayName || "Away",
    homeScore: home?.score ? Number(home.score) : null,
    awayScore: away?.score ? Number(away.score) : null,
    venue: competition?.venue?.fullName || null,
    broadcast: competition?.broadcasts?.[0]?.names?.[0] || null
  };
}

export async function getNextLeagueMatch(leagueKey) {
  const league = LEAGUES[leagueKey];
  if (!league) {
    throw new Error(`Unsupported league: ${leagueKey}`);
  }

  const checkpoints = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120];

  for (const dayOffset of checkpoints) {
    const date = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    const json = await fetchJson(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnSlug}/scoreboard?dates=${toEspnDate(date)}`,
      {},
      300
    );

    const candidate = (json.events || [])
      .map((event) => normalizeEspnEvent(event, leagueKey))
      .filter((event) => new Date(event.kickoff).getTime() > Date.now())
      .sort((left, right) => new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime())[0];

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export async function getMatchResult(leagueKey, eventId) {
  const league = LEAGUES[leagueKey];
  const json = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnSlug}/summary?event=${eventId}`,
    {},
    15
  );

  const competition = json.header?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((entry) => entry.homeAway === "home");
  const away = competitors.find((entry) => entry.homeAway === "away");

  return {
    id: eventId,
    leagueKey,
    homeTeam: home?.team?.displayName || "Home",
    awayTeam: away?.team?.displayName || "Away",
    homeScore: home?.score ? Number(home.score) : null,
    awayScore: away?.score ? Number(away.score) : null,
    completed: Boolean(competition?.status?.type?.completed),
    shortDetail: competition?.status?.type?.shortDetail || null,
    dateLabel: competition?.date ? toIsoDate(new Date(competition.date)) : null
  };
}

export function getNextBitcoinWindow(now = Math.floor(Date.now() / 1000)) {
  const bucketStart = Math.floor(now / BTC_MARKET_DURATION_SECONDS) * BTC_MARKET_DURATION_SECONDS;
  const start = now > bucketStart + 8 * 60 ? bucketStart + BTC_MARKET_DURATION_SECONDS : bucketStart;
  const end = start + BTC_MARKET_DURATION_SECONDS;

  return {
    start,
    end,
    closeTime: end,
    resolveTime: end + 60
  };
}
