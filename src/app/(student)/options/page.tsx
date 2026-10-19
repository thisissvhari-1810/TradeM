"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/api";

type Desk = {
  message: string;
  indexSource: string;
  premiumSource: string;
  asOf: string;
  stale: boolean;
  spot: number;
  lotSize: number;
  lotSizeNote: string;
  model: { name: string; status: string; updatedAt: string };
  chart: Array<{ time: number; close: number; vwap: number | null }>;
  chain: Array<{ key: string; side: "CE" | "PE"; strike: number; expiry: string; ltp: number | null; bid: number | null; ask: number | null; volume: number | null; oi: number | null; iv: number | null }>;
  signal: {
    direction: "CE" | "PE" | "NO TRADE";
    contractKey: string | null;
    entry: number | null;
    stop: number | null;
    target: number | null;
    riskRupees: number | null;
    rewardRupees: number | null;
    maxPremiumRupees: number | null;
    ruleScore: number;
    scoreNote: string;
    reasons: string[];
    rejections: string[];
    quality: string;
    dataTimestamp: string;
  };
  risk: { ok: boolean; reasons: string[]; budget: string; dailyLossLimit: string; remainingLoss: string; entriesUsed: number; entryLimit: number };
  cash: string;
  equity: string;
  unrealized: string;
  dayRealized: string;
  position: { contractKey: string; right: string; strike: number; expiry: string; quantity: number; average: string; stop: string; target: string; mark: string } | null;
  orders: Array<{ id: string; action: string; contractKey: string; status: string; reason: string; fill: string | null; charges: string; createdAt: string }>;
  backtest: {
    note: string;
    inSample: Report;
    test: Report;
  };
};

type Report = {
  window: string;
  trades: number;
  netPnl: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  profitFactor: number | null;
  maxDrawdown: number;
  consecutiveLosses: number;
  byMonth: Array<{ month: string; net: number }>;
  byRegime: Array<{ regime: string; trades: number; net: number }>;
};

export default function OptionsPage() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api<Desk>("/api/options").then(setDesk).catch((caught) => setError(caught instanceof Error ? caught.message : "Options desk unavailable."));
  }

  useEffect(() => { load(); }, []);

  async function send(action: "BUY" | "CLOSE") {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await api<{ message: string }>("/api/options", { action, idempotencyKey: `${action}:${Date.now()}` });
      setNotice(result.message);
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The simulated order was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  if (!desk) return <section className="mx-auto max-w-5xl"><h1 className="text-xl font-semibold">NIFTY options</h1><p className="mt-2 text-sm text-muted">{error || "Loading the simulated options desk…"}</p></section>;
  const strikes = [...new Set(desk.chain.map((row) => row.strike))].sort((a, b) => a - b);
  return (
    <section className="mx-auto max-w-5xl space-y-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-primary">Simulated · paper only</p>
        <h1 className="text-xl font-semibold">NIFTY 50 options</h1>
        <p className="mt-1 text-sm text-muted">{desk.message}</p>
        <p className="mt-1 text-xs text-muted">Index source {desk.indexSource} · Premium source {desk.premiumSource} · As of {new Date(desk.asOf).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {desk.stale ? "Data is stale" : "Freshness check passed"} · {desk.model.status}</p>
      </header>
      {error ? <p className="text-sm text-loss">{error}</p> : null}
      {notice ? <p className="text-sm text-text">{notice}</p> : null}
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <article className="border border-border bg-panel p-3">
          <p className="text-sm">NIFTY <span className="font-mono text-text">{desk.spot.toFixed(2)}</span></p>
          <PriceChart rows={desk.chart} />
          <p className="mt-2 text-[11px] text-muted">Gold line is session VWAP. The white line is the 5-minute close. This is a practice view, not a broker chart.</p>
        </article>
        <article className="border border-border bg-panel p-3 text-sm">
          <h2 className="font-semibold">Signal · {desk.signal.direction}</h2>
          <p className="mt-1 text-xs text-muted">Rule score {desk.signal.ruleScore}. {desk.signal.scoreNote}</p>
          <p className="mt-2">Data time {new Date(desk.signal.dataTimestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
          {desk.signal.contractKey ? <p className="mt-1 font-mono text-xs">{desk.signal.contractKey}</p> : null}
          <dl className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between"><dt>Entry assumption</dt><dd className="font-mono">{money(desk.signal.entry)}</dd></div>
            <div className="flex justify-between"><dt>Stop</dt><dd className="font-mono">{money(desk.signal.stop)}</dd></div>
            <div className="flex justify-between"><dt>Target</dt><dd className="font-mono">{money(desk.signal.target)}</dd></div>
            <div className="flex justify-between"><dt>Premium risk</dt><dd className="font-mono">{money(desk.signal.riskRupees)}</dd></div>
            <div className="flex justify-between"><dt>Premium reward</dt><dd className="font-mono">{money(desk.signal.rewardRupees)}</dd></div>
            <div className="flex justify-between"><dt>Maximum premium</dt><dd className="font-mono">{money(desk.signal.maxPremiumRupees)}</dd></div>
          </dl>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">{desk.signal.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          {desk.signal.rejections.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-loss">{desk.signal.rejections.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
          <button className="mt-3 h-8 bg-primary px-3 text-xs font-semibold text-on-primary disabled:opacity-40" disabled={busy || desk.signal.direction === "NO TRADE" || !desk.risk.ok} onClick={() => void send("BUY")}>Buy 1 simulated lot</button>
        </article>
      </div>
      <article className="border border-border bg-panel p-3 text-sm">
        <h2 className="font-semibold">Risk budget</h2>
        <p className="mt-1 text-xs text-muted">Cash {desk.cash} · Equity {desk.equity} · Unrealized {desk.unrealized} · Day realized {desk.dayRealized}</p>
        <p className="mt-1 text-xs text-muted">Per-trade cap {desk.risk.budget} · Daily loss limit {desk.risk.dailyLossLimit} · Remaining {desk.risk.remainingLoss} · Entries {desk.risk.entriesUsed}/{desk.risk.entryLimit}</p>
        <p className="mt-1 text-xs text-muted">{desk.lotSizeNote} Sample lot shown: {desk.lotSize}.</p>
        {desk.risk.reasons.length ? <ul className="mt-2 list-disc pl-4 text-xs text-loss">{desk.risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p className="mt-2 text-xs text-profit">The risk engine is not blocking a new entry.</p>}
      </article>
      <article className="overflow-hidden border border-border bg-panel">
        <h2 className="px-3 py-2 text-sm font-semibold">Option chain</h2>
        <table className="text-xs">
          <thead><tr><th>CE bid</th><th>CE ask</th><th>CE LTP</th><th>Strike</th><th>PE LTP</th><th>PE bid</th><th>PE ask</th></tr></thead>
          <tbody>
            {strikes.map((strike) => {
              const call = desk.chain.find((row) => row.strike === strike && row.side === "CE");
              const put = desk.chain.find((row) => row.strike === strike && row.side === "PE");
              const selected = desk.signal.contractKey === call?.key || desk.signal.contractKey === put?.key;
              return (
                <tr key={strike} className={selected ? "bg-elevated" : ""}>
                  <td className="font-mono">{quote(call?.bid)}</td>
                  <td className="font-mono">{quote(call?.ask)}</td>
                  <td className="font-mono">{quote(call?.ltp)}</td>
                  <td className="font-semibold">{strike}</td>
                  <td className="font-mono">{quote(put?.ltp)}</td>
                  <td className="font-mono">{quote(put?.bid)}</td>
                  <td className="font-mono">{quote(put?.ask)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
      <article className="border border-border bg-panel p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Simulated position</h2>
          <button className="h-8 border border-border px-3 text-xs disabled:opacity-40" disabled={busy || !desk.position} onClick={() => void send("CLOSE")}>Close at bid</button>
        </div>
        {desk.position ? <p className="mt-2 font-mono text-xs">{desk.position.contractKey} · qty {desk.position.quantity} · avg {desk.position.average} · mark {desk.position.mark} · stop {desk.position.stop} · target {desk.position.target}</p> : <p className="mt-2 text-xs text-muted">No open simulated option.</p>}
        <table className="mt-3 text-xs">
          <thead><tr><th>Time</th><th>Action</th><th>Status</th><th>Fill</th><th>Charges</th><th>Note</th></tr></thead>
          <tbody>
            {desk.orders.length === 0 ? <tr><td colSpan={6} className="text-muted">No simulated options orders yet.</td></tr> : null}
            {desk.orders.map((order) => <tr key={order.id}><td>{new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td>{order.action}</td><td>{order.status}</td><td className="font-mono">{order.fill ?? "—"}</td><td className="font-mono">{order.charges}</td><td>{order.reason}</td></tr>)}
          </tbody>
        </table>
      </article>
      <article className="border border-border bg-panel p-3 text-sm">
        <h2 className="font-semibold">Backtest</h2>
        <p className="mt-1 text-xs text-muted">{desk.backtest.note}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <ReportCard report={desk.backtest.inSample} />
          <ReportCard report={desk.backtest.test} />
        </div>
      </article>
    </section>
  );
}

function ReportCard({ report }: { report: Report }) {
  return (
    <div className="border border-border p-2 text-xs">
      <p className="font-semibold uppercase">{report.window}</p>
      <p className="mt-1">Trades {report.trades} · Net ₹{report.netPnl} · Win rate {(report.winRate * 100).toFixed(1)}%</p>
      <p>Average win ₹{report.averageWin} · Average loss ₹{report.averageLoss} · Expectancy ₹{report.expectancy}</p>
      <p>Profit factor {report.profitFactor ?? "n/a"} · Max drawdown ₹{report.maxDrawdown} · Loss streak {report.consecutiveLosses}</p>
      <p className="mt-1 text-muted">{report.byMonth.map((row) => `${row.month} ₹${row.net}`).join(" · ") || "No closed months."}</p>
      <p className="text-muted">{report.byRegime.map((row) => `${row.regime} ${row.trades} trades ₹${row.net}`).join(" · ") || "No regime split."}</p>
    </div>
  );
}

function PriceChart({ rows }: { rows: Array<{ close: number; vwap: number | null }> }) {
  if (rows.length < 2) return <p className="mt-3 text-xs text-muted">Not enough closed candles to draw.</p>;
  const values = rows.flatMap((row) => [row.close, row.vwap ?? row.close]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 640;
  const height = 180;
  const x = (index: number) => 8 + (index / (rows.length - 1)) * (width - 16);
  const y = (value: number) => height - 16 - ((value - min) / Math.max(0.01, max - min)) * (height - 32);
  const line = (pick: (row: { close: number; vwap: number | null }) => number | null) => rows.flatMap((row, index) => {
    const value = pick(row);
    return value == null ? [] : [`${index === 0 ? "M" : "L"}${x(index)},${y(value)}`];
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-44 w-full" role="img" aria-label="NIFTY 5-minute closes and VWAP">
      <path d={line((row) => row.close)} fill="none" stroke="#F8FAFC" strokeWidth="1.6" />
      <path d={line((row) => row.vwap)} fill="none" stroke="#D4AF37" strokeWidth="1.4" />
    </svg>
  );
}

function money(value: number | null) {
  return value == null ? "—" : `₹${value.toFixed(2)}`;
}

function quote(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(2);
}
