"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts";
import { api } from "@/components/api";

type Analytics = {
  winRate: string;
  averageWin: string;
  averageLoss: string;
  profitFactor: string;
  maxDrawdown: string;
  wins: number;
  losses: number;
  insights: string[];
  disclaimer: string;
  equityCurve: Array<{ time: number; value: number }>;
  summary: { allTimeReturn: string; performanceReturn: string; equity: string; dailyReturn: string | null; monthlyReturn: string | null };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api<Analytics>("/api/workspace?view=analytics").then(setData).catch((caught) => setError(caught.message));
  }, []);
  useEffect(() => {
    if (!ref.current || !data?.equityCurve.length) return;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 260,
      layout: { background: { type: ColorType.Solid, color: "#151F32" }, textColor: "#94A3B8" },
      grid: { vertLines: { color: "#1C2940" }, horzLines: { color: "#1C2940" } },
    });
    const series = chart.addSeries(LineSeries, { color: "#2563EB" });
    series.setData(data.equityCurve.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [data]);
  if (error) return <p className="text-loss">{error}</p>;
  if (!data) return <p className="text-muted">Loading analytics…</p>;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Performance</h1>
      <p className="max-w-3xl text-sm text-muted">{data.disclaimer}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Equity", data.summary.equity],
          ["All-time", data.summary.allTimeReturn],
          ["Performance", data.summary.performanceReturn],
          ["Week / today", data.summary.dailyReturn ?? "—"],
          ["Month", data.summary.monthlyReturn ?? "—"],
          ["Max drawdown", data.maxDrawdown],
          ["Win rate", data.winRate],
          ["Average win", data.averageWin],
          ["Average loss", data.averageLoss],
          ["Profit factor", data.profitFactor],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-panel p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-mono">{value}</p></div>
        ))}
      </div>
      <div ref={ref} className="h-[260px] rounded-xl border border-border bg-panel" />
      {data.equityCurve.length === 0 ? <p className="text-sm text-muted">The equity curve appears after the first portfolio snapshot.</p> : null}
      <ul className="space-y-2 text-sm">{data.insights.length ? data.insights.map((item) => <li key={item} className="rounded border border-border bg-panel px-3 py-2">{item}</li>) : <li className="text-muted">No repeated mistake pattern is visible yet.</li>}</ul>
      <p className="text-xs text-muted">Closed trades: {data.wins} winning, {data.losses} losing. Flat trades are excluded from win rate.</p>
    </section>
  );
}
