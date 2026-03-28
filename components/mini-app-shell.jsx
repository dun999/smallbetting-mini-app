"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BrowserProvider, Contract, ethers } from "ethers";
import sdk from "@farcaster/miniapp-sdk";
import { BASE_CHAIN_HEX, CONTRACT_ADDRESS, MAX_ENTRY_USDC, USDC_ADDRESS } from "../lib/config.js";
import { ERC20_ABI, SMALLBETTING_ABI } from "../lib/abis.js";

function abbreviateAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUsd(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 1000 ? 0 : 2
  }).format(amount);
}

function usePolling(url, intervalMs) {
  const [state, setState] = useState({ data: null, error: "", loading: true });

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function load() {
      try {
        const response = await fetch(url, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Request failed");
        if (!cancelled) setState({ data: json, error: "", loading: false });
      } catch (error) {
        if (!cancelled) setState((current) => ({ data: current.data, error: error.message, loading: false }));
      } finally {
        if (!cancelled) timer = window.setTimeout(load, intervalMs);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [intervalMs, url]);

  return state;
}

async function resolveInjectedProvider() {
  const farcasterProvider = await sdk.wallet.getEthereumProvider().catch(() => undefined);
  if (farcasterProvider) return farcasterProvider;
  if (typeof window !== "undefined" && window.ethereum) return window.ethereum;
  return undefined;
}

async function getWalletClients() {
  const injected = await resolveInjectedProvider();
  if (!injected) throw new Error("Wallet provider is unavailable inside this client.");
  try {
    await injected.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN_HEX }] });
  } catch (error) {
    console.warn("wallet_switchEthereumChain failed", error);
  }
  const browserProvider = new BrowserProvider(injected);
  const signer = await browserProvider.getSigner();
  return { provider: browserProvider, signer, address: await signer.getAddress() };
}

function MarketCard({ card, amount, onAmountChange, onBet, onClaim, pendingAction, walletAddress, position }) {
  const disabled = !card.market || card.market.status !== "open" || pendingAction;
  const isFootball = card.kind !== "btc";
  const live = card.live;
  const pool = card.market ? formatUsd(card.market.poolUsd) : "Waiting for sync";
  const kickoffText = live?.kickoff
    ? new Date(live.kickoff).toLocaleString()
    : card.kind === "btc"
      ? new Date(card.draft.closeTime * 1000).toLocaleTimeString()
      : "Official fixture not published yet";

  return (
    <article className="market-card">
      <div className="market-top">
        <div>
          <span className="market-badge" style={{ color: card.accent }}>{card.label}</span>
          <h3>{card.market?.title || card.draft.title}</h3>
        </div>
        <div className="market-meta">{card.market ? `Pool ${pool}` : "No exact market live"}</div>
      </div>

      {isFootball ? (
        <>
          <div className="score-row">
            <div className="team-block">
              <span className="team-name">{live?.homeTeam || card.draft.optionA}</span>
              <span className="team-score">{live?.homeScore ?? "-"}</span>
            </div>
            <div className="subtle">vs</div>
            <div className="team-block" style={{ textAlign: "right" }}>
              <span className="team-name">{live?.awayTeam || card.draft.optionB}</span>
              <span className="team-score">{live?.awayScore ?? "-"}</span>
            </div>
          </div>
          <p className="subtle">Kickoff {kickoffText}</p>
        </>
      ) : (
        <>
          <p className="subtle">10-minute BTC market settles from live CoinGecko movement. If fewer than 2 unique bettors join or one side stays empty, the market is void and users can claim a full refund.</p>
          <p className="subtle">Window closes {kickoffText}.</p>
        </>
      )}

      <div className="divider" />

      {card.market ? (
        <>
          <div className="market-footer">
            <span className="subtle">Participants {card.market.participants}</span>
            <span className="subtle">Side A {formatUsd(card.market.totalAUsd)} | Side B {formatUsd(card.market.totalBUsd)}</span>
          </div>

          <input className="amount-input" min="0.1" max={MAX_ENTRY_USDC} step="0.1" type="number" value={amount} onChange={(event) => onAmountChange(card.kind, event.target.value)} placeholder="Enter USDC amount" />

          <div className="market-actions">
            <button className="side-button primary" disabled={disabled} onClick={() => onBet(card.market.marketId, 1, amount)}>Bet {card.market.optionA}</button>
            <button className="side-button secondary" disabled={disabled} onClick={() => onBet(card.market.marketId, 2, amount)}>Bet {card.market.optionB}</button>
          </div>

          <p className="subtle">Per-market exposure is capped onchain at {formatUsd(MAX_ENTRY_USDC)} total, even across multiple entries.</p>
          {walletAddress && position ? <p className="subtle">Your stake: {formatUsd(position.amountA)} on {card.market.optionA}, {formatUsd(position.amountB)} on {card.market.optionB}{position.claimable > 0 ? `, claimable ${formatUsd(position.claimable)}` : ""}</p> : null}
          {walletAddress && position?.claimable > 0 ? <button className="ghost-button" disabled={pendingAction} onClick={() => onClaim(card.market.marketId)}>Claim payout</button> : null}
        </>
      ) : (
        <div className="empty-note">Live schedule is loaded, but there is no exact onchain market for this current slot yet. Betting stays disabled until the sync job creates the matching market.</div>
      )}
    </article>
  );
}

function FaqSection() {
  const items = [
    {
      question: "What is the maximum bet?",
      answer: "The maximum exposure is $5 per wallet per market. This limit is enforced onchain across repeated entries, not just per single transaction."
    },
    {
      question: "How does cashout work?",
      answer: "There is no early cashout in the current version. You can claim your payout after a winning market is resolved, or claim your refund if the market is void."
    },
    {
      question: "When is a market void?",
      answer: "A market is void if fewer than 2 unique bettors joined, if one side has no opposing stake, or if the resolver cannot produce a valid final result from the live data source."
    },
    {
      question: "How are Bitcoin markets settled?",
      answer: "Bitcoin markets use a rolling 10-minute window. The resolver compares the BTC price at the start and end of the market window using live market data."
    },
    {
      question: "How are football markets settled?",
      answer: "Football markets use the official final match result from the configured live data provider. Home win resolves to side A, away win resolves to side B, and a draw resolves as void in the current version."
    },
    {
      question: "Why is betting disabled on a card?",
      answer: "Betting is disabled when there is no exact onchain market for the current live slot, when the market is already locked, or while your wallet action is still pending."
    }
  ];

  return (
    <section>
      <div className="section-header">
        <h2>FAQ</h2>
        <span className="subtle">Rules, limits, and settlement behavior</span>
      </div>
      <div className="card-grid">
        {items.map((item) => (
          <article className="market-card" key={item.question}>
            <h3>{item.question}</h3>
            <p className="subtle">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MiniAppShell() {
  const dashboard = usePolling("/api/markets", 30000);
  const [walletAddress, setWalletAddress] = useState("");
  const [amounts, setAmounts] = useState({ btc: "1", epl: "1", laliga: "1", ucl: "1" });
  const [positions, setPositions] = useState({});
  const [pendingAction, setPendingAction] = useState("");
  const [status, setStatus] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    sdk.actions.ready().catch((error) => console.warn("mini app ready failed", error));
  }, []);

  const cards = dashboard.data?.cards || [];
  const btcChart = dashboard.data?.btc?.chart || [];
  const btcTicker = dashboard.data?.btc?.ticker;

  async function refreshPositions(targetAddress = walletAddress, currentCards = cards) {
    if (!targetAddress) return;
    const nextEntries = await Promise.all(
      currentCards.filter((card) => card.market).map(async (card) => {
        const response = await fetch(`/api/positions?marketId=${card.market.marketId}&address=${targetAddress}`, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Failed to load positions");
        return [card.market.marketId, json];
      })
    );
    setPositions(Object.fromEntries(nextEntries));
  }

  async function connectWallet() {
    setStatus("Connecting wallet...");
    const clients = await getWalletClients();
    setWalletAddress(clients.address);
    setStatus(`Connected ${abbreviateAddress(clients.address)}`);
    await refreshPositions(clients.address);
  }

  async function handleBet(marketId, side, rawAmount) {
    const parsed = Number(rawAmount);
    if (!parsed || parsed <= 0 || parsed > MAX_ENTRY_USDC) {
      setStatus(`Entry amount must be between $0.1 and $${MAX_ENTRY_USDC}.`);
      return;
    }

    setPendingAction(`bet-${marketId}-${side}`);
    setStatus("Waiting for wallet confirmation...");

    try {
      const { signer, address } = await getWalletClients();
      if (!walletAddress) setWalletAddress(address);
      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const market = new Contract(CONTRACT_ADDRESS, SMALLBETTING_ABI, signer);
      const amount = ethers.parseUnits(parsed.toFixed(2), 6);
      const fee = await market.flatFee();
      const needed = amount + fee;
      const allowance = await usdc.allowance(address, CONTRACT_ADDRESS);

      if (allowance < needed) {
        const approveTx = await usdc.approve(CONTRACT_ADDRESS, needed);
        setStatus("Approving USDC...");
        await approveTx.wait();
      }

      const tx = await market.enter(marketId, side, amount);
      setStatus("Submitting bet to Base...");
      await tx.wait();
      await sdk.haptics.notificationOccurred("success").catch(() => {});
      setStatus("Bet placed successfully.");
      await refreshPositions(address);
    } catch (error) {
      setStatus(error.message || "Bet failed.");
    } finally {
      setPendingAction("");
    }
  }

  async function handleClaim(marketId) {
    setPendingAction(`claim-${marketId}`);
    setStatus("Claiming payout...");
    try {
      const { signer, address } = await getWalletClients();
      const market = new Contract(CONTRACT_ADDRESS, SMALLBETTING_ABI, signer);
      const tx = await market.claim(marketId);
      await tx.wait();
      await sdk.haptics.notificationOccurred("success").catch(() => {});
      setStatus("Claim completed.");
      await refreshPositions(address);
    } catch (error) {
      setStatus(error.message || "Claim failed.");
    } finally {
      setPendingAction("");
    }
  }

  useEffect(() => {
    if (walletAddress && cards.length > 0) {
      refreshPositions(walletAddress, cards).catch((error) => console.warn("refresh positions failed", error));
    }
  }, [walletAddress, dashboard.data]);

  const cardsWithPositions = useMemo(() => cards.map((card) => ({ ...card, position: card.market ? positions[card.market.marketId] : null })), [cards, positions]);

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow"><span className="pulse-dot" />Base x Farcaster Mini App</span>
        <div className="hero-grid">
          <div>
            <h1>Smallbetting</h1>
            <p>Micro prediction markets for Bitcoin and top football fixtures, built on Base for Farcaster. Only live data: CoinGecko for BTC, ESPN for schedules and scores, and your deployed contract for pool state.</p>
            <div className="pill-row">
              <div className="pill"><strong>Max $5</strong><span>Per market exposure, enforced onchain across repeated entries.</span></div>
              <div className="pill"><strong>$0.01 fee</strong><span>Flat platform fee on every entry, on top of a 1.5% winning fee.</span></div>
              <div className="pill"><strong>Auto void</strong><span>If fewer than 2 bettors join or one side stays empty at settlement, users refund by claim.</span></div>
            </div>
          </div>
          <div className="stats-row">
            <div className="stat-card">
              <small>BTC spot</small>
              <h2>{btcTicker?.priceUsd ? formatUsd(btcTicker.priceUsd) : "--"}</h2>
              <p className="subtle">24h {btcTicker?.change24h ? `${btcTicker.change24h.toFixed(2)}%` : "--"}</p>
            </div>
            <div className="stat-card">
              <small>Wallet</small>
              <h2>{walletAddress ? abbreviateAddress(walletAddress) : "Not connected"}</h2>
              <div className="wallet-row">
                <span className="subtle">{status || "Connect inside Farcaster or a compatible browser wallet."}</span>
                <button className="cta-button" onClick={connectWallet}>{walletAddress ? "Reconnect" : "Connect"}</button>
              </div>
            </div>
            <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
              <div className="status-line"><span className="pulse-dot" /><span>Contract {CONTRACT_ADDRESS.slice(0, 10)}... | Live dashboard refreshes every 30 seconds.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-header"><h2>Bitcoin Pulse</h2><span className="subtle">Animated live chart from CoinGecko</span></section>
      <section className="panel-card chart-frame">
        <div className="chart-glow" />
        {hydrated ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={btcChart}>
              <defs><linearGradient id="btcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff8f5a" stopOpacity={0.48} /><stop offset="95%" stopColor="#ff8f5a" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" minTickGap={24} stroke="#8ba6b5" tickLine={false} axisLine={false} />
              <YAxis stroke="#8ba6b5" tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
              <Tooltip contentStyle={{ background: "#102433", border: "1px solid rgba(165, 227, 255, 0.18)", borderRadius: 16 }} formatter={(value) => formatUsd(Number(value))} />
              <Area type="monotone" dataKey="price" stroke="#ff8f5a" strokeWidth={3} fillOpacity={1} fill="url(#btcFill)" isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </section>

      <section className="section-header"><h2>Live Markets</h2><span className="subtle">BTC + EPL + LaLiga + UCL, no mock data</span></section>
      {dashboard.error ? <div className="error-note">{dashboard.error}</div> : null}
      <section className="card-grid">
        {cardsWithPositions.map((card) => (
          <MarketCard key={card.kind} card={card} amount={amounts[card.kind] || "1"} onAmountChange={(kind, value) => setAmounts((current) => ({ ...current, [kind]: value }))} onBet={handleBet} onClaim={handleClaim} pendingAction={pendingAction} walletAddress={walletAddress} position={card.position} />
        ))}
      </section>

      <FaqSection />
    </main>
  );
}
