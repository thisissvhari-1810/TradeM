"use client";

import { useEffect, useState } from "react";
import { api, tone } from "@/components/api";

type Portfolio = {
  startingCapital: string;
  cashAvailable: string;
  cashReserved: string;
  holdingsValue: string;
  equity: string;
  realized: string;
  unrealized: string;
  charges: string;
  dailyReturn: string | null;
  allTimeReturn: string;
  performanceReturn: string;
  stale: boolean;
  valuationMessage: string;
  allocation: Array<{ label: string; percent: string }>;
  positions: Array<{ symbol: string; quantity: number; averageCost: string; marketValue: string | null; unrealized: string | null; realized: string }>;
};

export default function PortfolioPage() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Portfolio>("/api/portfolio").then(setData).catch((caught) => setError(caught.message));
  }, []);
  if (error) return <p className="text-loss">{error}</p>;
  if (!data) return <p className="text-muted">Loading portfolio…</p>;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Portfolio</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Equity", data.equity],
          ["Available", data.cashAvailable],
          ["Reserved", data.cashReserved],
          ["Realized", data.realized],
          ["Unrealized", data.unrealized],
          ["All-time return", data.allTimeReturn],
          ["Performance return", data.performanceReturn],
          ["Today", data.dailyReturn ?? "—"],
          ["Charges", data.charges],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-panel p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className={`mt-1 font-mono ${tone(value)}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">{data.valuationMessage} Performance return removes administrator cash adjustments from the result.</p>
      <div className="rounded-xl border border-border bg-panel p-4">
        <h2 className="font-medium">Allocation</h2>
        <div className="mt-3 space-y-2">
          {data.allocation.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-mono text-muted">{item.percent}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Symbol</th><th>Qty</th><th>Avg cost</th><th>Value</th><th>Unrealized</th><th>Realized</th></tr></thead>
          <tbody>
            {data.positions.length === 0 ? <tr><td className="p-3 text-muted" colSpan={6}>No open holdings.</td></tr> : null}
            {data.positions.map((position) => (
              <tr key={position.symbol} className="border-t border-border">
                <td className="p-3">{position.symbol}</td>
                <td>{position.quantity}</td>
                <td className="font-mono">₹{position.averageCost}</td>
                <td className="font-mono">{position.marketValue ? `₹${position.marketValue}` : "—"}</td>
                <td className={`font-mono ${tone(position.unrealized)}`}>{position.unrealized ?? "—"}</td>
                <td className="font-mono">{position.realized}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
