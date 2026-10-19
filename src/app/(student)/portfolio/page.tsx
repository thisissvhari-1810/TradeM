"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, tone } from "@/components/api";
import { PageFrame, Stat } from "@/components/page-frame";

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
  if (error) return <p className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading portfolio…</p>;
  return (
    <PageFrame kicker="Practice account" title="Portfolio" lede={`${data.valuationMessage} Performance return removes administrator cash adjustments.`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <Stat key={label} label={label} value={value} className={tone(value)} />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-panel p-4">
        <h2 className="text-sm font-semibold">Allocation</h2>
        <div className="mt-4 space-y-3">
          {data.allocation.map((item) => {
            const width = Math.max(0, Math.min(100, Number.parseFloat(item.percent) || 0));
            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-mono text-muted">{item.percent}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                  <div className="h-full rounded-full bg-[#2962ff]" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Symbol</th><th>Qty</th><th>Avg cost</th><th>Value</th><th>Unrealized</th><th>Realized</th></tr></thead>
          <tbody>
            {data.positions.length === 0 ? <tr><td className="text-muted" colSpan={6}>No open holdings.</td></tr> : null}
            {data.positions.map((position) => (
              <tr key={position.symbol}>
                <td className="font-medium"><Link href={`/terminal?symbol=${position.symbol}`}>{position.symbol}</Link></td>
                <td className="font-mono">{position.quantity}</td>
                <td className="font-mono">₹{position.averageCost}</td>
                <td className="font-mono">{position.marketValue ? `₹${position.marketValue}` : "—"}</td>
                <td className={`font-mono ${tone(position.unrealized)}`}>{position.unrealized ?? "—"}</td>
                <td className="font-mono">{position.realized}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
