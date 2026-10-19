"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, tone } from "@/components/api";

type Trade = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  entryAt: string;
  exitAt: string;
  averageEntry: string;
  averageExit: string;
  gross: string;
  charges: string;
  net: string;
  ret: string;
  profitable: boolean;
  loss: boolean;
  holdingSeconds: number;
  hasReceipt: boolean;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Trade[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [symbol, setSymbol] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    api<Trade[]>("/api/trades").then(setRows).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load trade history."));
  }, []);
  const visible = useMemo(() => rows.filter((row) => {
    if (filter === "win" && !row.profitable) return false;
    if (filter === "loss" && !row.loss) return false;
    if (symbol && !row.symbol.toLowerCase().includes(symbol.trim().toLowerCase())) return false;
    const closed = new Date(row.exitAt).getTime();
    if (from && closed < new Date(from).getTime()) return false;
    if (to && closed > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  }), [rows, filter, symbol, from, to]);
  const wins = rows.filter((row) => row.profitable);
  const losses = rows.filter((row) => row.loss);
  return (
    <section className="mx-auto max-w-6xl text-text">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Paper trading</p>
      <h1 className="mt-1 text-xl font-semibold">Trade history</h1>
      <p className="mt-1 text-sm text-muted">A row is saved when a long position returns to zero shares. Losing trades stay in the list. Times are India Standard Time.</p>
      {error ? <p className="mt-3 text-sm text-loss">{error}</p> : null}
      <div className="mt-4 grid gap-px bg-border sm:grid-cols-3 lg:grid-cols-4">
        {[
          ["Closed trades", String(rows.length)],
          ["Winners", String(wins.length)],
          ["Losers", String(losses.length)],
          ["Win rate", rows.length ? `${((wins.length / rows.length) * 100).toFixed(1)}%` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-2"><p className="text-[10px] uppercase text-muted">{label}</p><p className="mt-1 font-mono text-sm">{value}</p></div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "win", "loss"] as const).map((item) => (
          <button key={item} className={`h-8 px-2 text-xs ${filter === item ? "bg-primary text-on-primary" : "border border-border"}`} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "win" ? "Profitable" : "Losses"}</button>
        ))}
        <input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="Symbol" aria-label="Filter symbol" className="h-8 w-28 px-2 text-xs" />
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" className="h-8 px-2 text-xs" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" className="h-8 px-2 text-xs" />
      </div>
      <div className="mt-3 overflow-x-auto border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Closed</th><th>Symbol</th><th>Qty</th><th>Entry</th><th>Exit</th><th>Held</th><th>Gross</th><th>Charges</th><th>Net</th><th>Return</th><th></th></tr></thead>
          <tbody>
            {visible.length === 0 ? <tr><td colSpan={11} className="text-muted">No closed positions match this filter. A buy that is still open stays in the portfolio.</td></tr> : null}
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap text-muted">{new Date(row.exitAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td><Link className="font-semibold" href={`/terminal?symbol=${row.symbol}`}>{row.symbol}</Link><span className="block text-xs text-muted">{row.name}</span></td>
                <td className="font-mono">{row.quantity}</td>
                <td className="font-mono">{row.averageEntry}</td>
                <td className="font-mono">{row.averageExit}</td>
                <td>{holdLabel(row.holdingSeconds)}</td>
                <td className={`font-mono ${tone(row.gross)}`}>{row.gross}</td>
                <td className="font-mono">{row.charges}</td>
                <td className={`font-mono ${tone(row.net)}`}>{row.net}</td>
                <td className={`font-mono ${tone(row.ret)}`}>{row.ret}</td>
                <td><Link className="text-primary" href={`/history/${row.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function holdLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
