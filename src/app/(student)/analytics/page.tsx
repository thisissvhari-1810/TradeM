"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts";
import { api } from "@/components/api";
import { themeColor } from "@/lib/theme";
import { PageFrame, Stat } from "@/components/page-frame";

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
      layout: { background: { type: ColorType.Solid, color: themeColor("--background", "#0A0D14") }, textColor: themeColor("--text", "#F8FAFC"), fontSize: 12, attributionLogo: false },
      grid: { vertLines: { color: themeColor("--grid", "#1E2636") }, horzLines: { color: themeColor("--grid", "#1E2636") } },
    });
    const series = chart.addSeries(LineSeries, { color: themeColor("--primary", "#D4AF37"), lineWidth: 2 });
    series.setData(data.equityCurve.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [data]);
  if (error) return <p className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading analytics…</p>;
  return (
    <PageFrame kicker="Review" title="Analytics" lede={data.disclaimer}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Equity", data.summary.equity],
          ["All-time", data.summary.allTimeReturn],
          ["Performance", data.summary.performanceReturn],
          ["Today", data.summary.dailyReturn ?? "—"],
          ["Month", data.summary.monthlyReturn ?? "—"],
          ["Max drawdown", data.maxDrawdown],
          ["Win rate", data.winRate],
          ["Average win", data.averageWin],
          ["Average loss", data.averageLoss],
          ["Profit factor", data.profitFactor],
        ].map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <div ref={ref} className="h-[280px]" />
      </div>
      {data.equityCurve.length === 0 ? <p className="rounded-lg border border-border bg-panel px-4 py-3 text-sm text-muted">The equity curve appears after the first portfolio snapshot.</p> : null}
      <ul className="space-y-2 text-sm">
        {data.insights.length ? data.insights.map((item) => <li key={item} className="rounded-lg border border-border bg-panel px-4 py-3">{item}</li>) : <li className="rounded-lg border border-border bg-panel px-4 py-3 text-muted">No repeated mistake pattern is visible yet.</li>}
      </ul>
      <p className="text-xs text-muted">Closed trades: {data.wins} winning, {data.losses} losing. Flat trades are excluded from win rate.</p>
    </PageFrame>
  );
}
