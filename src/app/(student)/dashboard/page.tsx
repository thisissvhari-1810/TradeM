"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts";
import { api, tone } from "@/components/api";
import { themeColor } from "@/lib/theme";

type Account = { name: string };
type Quote = { symbol: string; last: string; previousClose: string; volume: string; mode: string; marketOpen: boolean; message: string; asOf: string };
type Instrument = { symbol: string; name: string; exchange: string; sector: string };
type Portfolio = {
  startingCapital: string; cashAvailable: string; cashReserved: string; holdingsValue: string; equity: string; realized: string; unrealized: string;
  dailyReturn: string | null; allTimeReturn: string; performanceReturn: string; valuationMessage: string;
  positions: Array<{ symbol: string; quantity: number; averageCost: string; mark: string | null; marketValue: string | null; unrealized: string | null }>;
  allocation: Array<{ label: string; percent: string }>;
};
type Activity = { orders: Array<{ id: string; symbol: string; side: string; type: string; quantity: number; status: string; avgFill: string | null; submittedAt: string }>; executions: Array<{ id: string; symbol: string; side: string; quantity: number; price: string; realized: string; executedAt: string }> };
type Analytics = { winRate: string; averageWin: string; averageLoss: string; maxDrawdown: string; wins: number; losses: number; disclaimer: string; equityCurve: Array<{ time: number; value: number }> };
type Lesson = { slug: string; title: string; minutes: number; completed: boolean };
type Path = { title: string; lessons: Lesson[] };
type Competition = { id: string; title: string; status: string; joined: boolean };
type Note = { id: string; title: string; read: boolean };
type Closed = { id: string; symbol: string; exitAt: string; quantity: number; net: string; ret: string };
type Watch = { symbol: string; name: string; exchange?: string };
type Mover = Instrument & { last: string; change: number; percent: number; mode: string };

const ACTIONS = [
  ["/terminal", "Open chart"],
  ["/markets", "Find a stock"],
  ["/screener", "Screener"],
  ["/portfolio", "Portfolio"],
  ["/orders", "Orders"],
  ["/history", "Trade history"],
  ["/watchlist", "Watchlist"],
  ["/journal", "Journal"],
  ["/learn", "Learn"],
  ["/analytics", "Analytics"],
];

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [closed, setClosed] = useState<Closed[]>([]);
  const [watch, setWatch] = useState<Watch[]>([]);
  const [movers, setMovers] = useState<Mover[]>([]);
  const [status, setStatus] = useState<Quote | null>(null);
  const [symbol, setSymbol] = useState("RELIANCE");
  const [error, setError] = useState("");
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Account>("/api/auth/account").then(setAccount).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load your account."));
    api<Portfolio>("/api/portfolio").then(setPortfolio).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the portfolio."));
    api<Activity>("/api/orders").then(setActivity).catch(() => setActivity(null));
    api<Analytics>("/api/workspace?view=analytics").then(setAnalytics).catch(() => setAnalytics(null));
    api<Path[]>("/api/workspace?view=learn").then(setPaths).catch(() => setPaths([]));
    api<Competition[]>("/api/workspace?view=competitions").then(setCompetitions).catch(() => setCompetitions([]));
    api<Note[]>("/api/workspace?view=notifications").then(setNotes).catch(() => setNotes([]));
    api<Closed[]>("/api/trades").then(setClosed).catch(() => setClosed([]));
    api<Watch[]>("/api/workspace?view=watchlist").then(setWatch).catch(() => setWatch([]));
    api<Instrument[]>("/api/instruments").then(async (rows) => {
      const quotes = await Promise.all(rows.map(async (row) => {
        try { return [row, await api<Quote>(`/api/market/quote?symbol=${row.symbol}`)] as const; }
        catch { return null; }
      }));
      const next = quotes.flatMap((item) => {
        if (!item) return [];
        const [row, quote] = item;
        const change = Number(quote.last) - Number(quote.previousClose);
        const percent = Number(quote.previousClose) ? (change / Number(quote.previousClose)) * 100 : 0;
        return [{ ...row, last: quote.last, change, percent, mode: quote.mode }];
      });
      setMovers(next);
      if (next[0]) setStatus(await api<Quote>(`/api/market/quote?symbol=${next[0].symbol}`).catch(() => null));
    }).catch(() => setMovers([]));
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    let chart: ReturnType<typeof createChart> | null = null;
    let stop = false;
    api<{ candles: Array<{ time: number; close: number }> }>(`/api/market/candles?symbol=${symbol}&timeframe=1d`).then((result) => {
      if (stop || !chartRef.current) return;
      chart = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 220,
        layout: { background: { type: ColorType.Solid, color: themeColor("--panel", "#141A26") }, textColor: themeColor("--muted", "#94A3B8"), fontSize: 11, attributionLogo: false },
        grid: { vertLines: { color: themeColor("--grid", "#1E2636") }, horzLines: { color: themeColor("--grid", "#1E2636") } },
        rightPriceScale: { borderColor: themeColor("--border", "#243044") },
        timeScale: { borderColor: themeColor("--border", "#243044") },
      });
      const series = chart.addSeries(LineSeries, { color: themeColor("--primary", "#D4AF37"), lineWidth: 2 });
      series.setData(result.candles.map((candle) => ({ time: candle.time as UTCTimestamp, value: candle.close })));
      chart.timeScale().fitContent();
    }).catch(() => undefined);
    return () => { stop = true; chart?.remove(); };
  }, [symbol]);

  const nextLesson = paths.flatMap((path) => path.lessons).find((lesson) => !lesson.completed);
  const unread = notes.filter((note) => !note.read).length;
  const gainers = [...movers].sort((a, b) => b.percent - a.percent).slice(0, 4);
  const losers = [...movers].sort((a, b) => a.percent - b.percent).slice(0, 4);
  const session = status ? (status.marketOpen ? "Open" : "Closed") : "Unknown";

  return (
    <div className="mx-auto max-w-6xl space-y-4 text-text">
      <header className="flex flex-wrap items-end justify-between gap-3 border border-border bg-panel px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Paper trading · virtual account</p>
          <h1 className="mt-1 text-xl font-semibold">Welcome back{account ? `, ${account.name}` : ""}</h1>
          <p className="mt-1 text-sm text-muted">NSE cash session: {session}. {status ? `${status.mode} · ${status.message}` : "Market status is not available yet."}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/terminal" className="bg-primary px-3 py-2 text-sm text-on-primary">Open trading terminal</Link>
          <Link href="/markets" className="border border-border px-3 py-2 text-sm">Explore markets</Link>
        </div>
      </header>
      {error ? <p className="border border-loss bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p> : null}
      {portfolio ? (
        <section className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Initial capital", portfolio.startingCapital],
            ["Equity", portfolio.equity],
            ["Available cash", portfolio.cashAvailable],
            ["Invested", portfolio.holdingsValue],
            ["Today", portfolio.dailyReturn ?? "—"],
            ["Realized", portfolio.realized],
            ["Unrealized", portfolio.unrealized],
            ["All-time", portfolio.allTimeReturn],
            ["Performance", portfolio.performanceReturn],
          ].map(([label, value]) => (
            <div key={label} className="bg-panel px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
              <p className={`mt-1 font-mono text-sm ${tone(value)}`}>{value}</p>
            </div>
          ))}
        </section>
      ) : <p className="text-sm text-muted">Loading the virtual account…</p>}
      <p className="text-xs text-muted">{portfolio?.valuationMessage} These figures are practice money. <Link className="text-primary" href="/portfolio">Open portfolio</Link></p>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <div className="border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">Market chart</h2>
            <select aria-label="Overview symbol" value={symbol} onChange={(event) => setSymbol(event.target.value)} className="h-8 max-w-[18rem] px-2 text-sm">
              {(movers.some((item) => item.symbol === symbol) ? movers : [{ symbol, name: symbol === "RELIANCE" ? "Reliance Industries Limited" : symbol, exchange: "NSE", sector: "EQ", last: "", change: 0, percent: 0, mode: "" }, ...movers]).map((item) => (
                <option key={item.symbol} value={item.symbol}>{item.name}</option>
              ))}
            </select>
          </div>
          <div ref={chartRef} className="h-[220px]" />
          <p className="border-t border-border px-3 py-2 text-xs text-muted">Daily closes from the configured source. <Link className="text-primary" href={`/terminal?symbol=${symbol}`}>Open the full chart</Link></p>
        </div>
        <div className="border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold">Watchlist</h2>
            <Link href="/watchlist" className="text-xs text-primary">Edit</Link>
          </div>
          {watch.length === 0 ? <p className="px-3 py-4 text-sm text-muted">No saved symbols. <Link className="text-primary" href="/watchlist">Add one</Link></p> : null}
          {watch.slice(0, 8).map((item) => (
            <Link key={item.symbol} href={`/terminal?symbol=${item.symbol}`} className="flex items-center justify-between border-t border-border px-3 py-2 text-sm hover:bg-elevated">
              <span><b>{item.symbol}</b> <span className="block text-xs text-muted">{item.name}</span></span>
              <span className="font-mono text-xs">{movers.find((mover) => mover.symbol === item.symbol)?.last ?? "—"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <MoverList title="Gainers" rows={gainers} />
        <MoverList title="Losers" rows={losers} />
      </section>
      <p className="text-xs text-muted">Gainers and losers are ranked from the practice catalogue quotes, not from an exchange movers feed. {movers[0] ? `Source status: ${movers[0].mode}.` : ""} Index symbols such as NIFTY 50 and SENSEX are not in this catalogue.</p>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto border border-border bg-panel">
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-sm font-semibold">Holdings</h2>
            <Link href="/portfolio" className="text-xs text-primary">Portfolio</Link>
          </div>
          <table className="text-sm">
            <thead><tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>Mark</th><th>Value</th><th>Unrealized</th></tr></thead>
            <tbody>
              {!portfolio || portfolio.positions.length === 0 ? <tr><td colSpan={6} className="text-muted">No holdings. <Link className="text-primary" href="/terminal">Open the terminal</Link></td></tr> : null}
              {portfolio?.positions.slice(0, 6).map((position) => (
                <tr key={position.symbol}>
                  <td><Link className="font-semibold" href={`/terminal?symbol=${position.symbol}`}>{position.symbol}</Link></td>
                  <td className="font-mono">{position.quantity}</td>
                  <td className="font-mono">{position.averageCost}</td>
                  <td className="font-mono">{position.mark ?? "—"}</td>
                  <td className="font-mono">{position.marketValue ?? "—"}</td>
                  <td className={`font-mono ${tone(position.unrealized)}`}>{position.unrealized ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-border bg-panel p-3">
          <h2 className="text-sm font-semibold">Allocation</h2>
          {portfolio && portfolio.allocation.length ? <div className="mx-auto mt-3 h-28 w-28 rounded-full" style={{ background: donut(portfolio.allocation) }} /> : <p className="mt-3 text-sm text-muted">Allocation appears after the account is valued.</p>}
          <ul className="mt-3 space-y-1 text-xs text-muted">{portfolio?.allocation.map((item) => <li key={item.label} className="flex justify-between"><span>{item.label}</span><span className="font-mono">{item.percent}</span></li>)}</ul>
        </div>
      </section>

      <section className="overflow-x-auto border border-border bg-panel">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-sm font-semibold">Recent orders</h2>
          <Link href="/orders" className="text-xs text-primary">All orders</Link>
        </div>
        <table className="text-sm">
          <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th><th>Fill</th></tr></thead>
          <tbody>
            {!activity || activity.orders.length === 0 ? <tr><td colSpan={7} className="text-muted">No orders in this practice period.</td></tr> : null}
            {activity?.orders.slice(0, 6).map((order) => (
              <tr key={order.id}>
                <td className="text-muted">{new Date(order.submittedAt).toLocaleString("en-IN")}</td>
                <td><Link href={`/terminal?symbol=${order.symbol}`}>{order.symbol}</Link></td>
                <td className={order.side === "BUY" ? "text-profit" : "text-loss"}>{order.side}</td>
                <td>{order.type}</td>
                <td className="font-mono">{order.quantity}</td>
                <td>{order.status}</td>
                <td className="font-mono">{order.avgFill ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto border border-border bg-panel">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-sm font-semibold">Closed trades</h2>
          <Link href="/history" className="text-xs text-primary">Trade history</Link>
        </div>
        {closed.length === 0 ? <p className="border-t border-border px-3 py-3 text-sm text-muted">No position has been closed yet. A purchase stays open until it is sold.</p> : null}
        {closed.slice(0, 5).map((row) => (
          <Link key={row.id} href={`/history/${row.id}`} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-border px-3 py-2 text-sm hover:bg-elevated">
            <span>{row.symbol} · {row.quantity} · {new Date(row.exitAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            <span className={`font-mono ${tone(row.net)}`}>{row.net}</span>
            <span className={`font-mono ${tone(row.ret)}`}>{row.ret}</span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="border border-border bg-panel p-3 text-sm">
          <h2 className="font-semibold">Performance</h2>
          {analytics ? (
            <dl className="mt-2 space-y-1 text-muted">
              <div className="flex justify-between"><dt>Win rate</dt><dd className="font-mono text-text">{analytics.winRate}</dd></div>
              <div className="flex justify-between"><dt>Closed trades</dt><dd className="font-mono text-text">{analytics.wins + analytics.losses}</dd></div>
              <div className="flex justify-between"><dt>Average win</dt><dd className="font-mono text-text">{analytics.averageWin}</dd></div>
              <div className="flex justify-between"><dt>Average loss</dt><dd className="font-mono text-text">{analytics.averageLoss}</dd></div>
              <div className="flex justify-between"><dt>Max drawdown</dt><dd className="font-mono text-text">{analytics.maxDrawdown}</dd></div>
            </dl>
          ) : <p className="mt-2 text-muted">Performance loads from closed practice trades.</p>}
          <p className="mt-2 text-xs text-muted">{analytics?.disclaimer} <Link className="text-primary" href="/analytics">Open analytics</Link></p>
        </article>
        <article className="border border-border bg-panel p-3 text-sm">
          <h2 className="font-semibold">Continue learning</h2>
          {nextLesson ? <p className="mt-2">{nextLesson.title} <span className="text-muted">· {nextLesson.minutes} min</span></p> : <p className="mt-2 text-muted">{paths.length ? "Published lessons are marked complete." : "No published lessons yet."}</p>}
          {nextLesson ? <Link href={`/learn/${nextLesson.slug}`} className="mt-2 inline-block text-primary">Resume lesson</Link> : <Link href="/learn" className="mt-2 inline-block text-primary">Learning centre</Link>}
        </article>
        <article className="border border-border bg-panel p-3 text-sm">
          <h2 className="font-semibold">Challenges</h2>
          {competitions.length === 0 ? <p className="mt-2 text-muted">No class challenges yet.</p> : competitions.slice(0, 3).map((item) => <p key={item.id} className="mt-2">{item.title} <span className="text-muted">· {item.status}{item.joined ? " · joined" : ""}</span></p>)}
          <Link href="/competitions" className="mt-2 inline-block text-primary">Open challenges</Link>
          <p className="mt-3 text-xs text-muted">{unread} unread alert{unread === 1 ? "" : "s"}. <Link className="text-primary" href="/notifications">Notifications</Link></p>
        </article>
      </section>

      <nav className="flex flex-wrap gap-2">
        {ACTIONS.map(([href, label]) => <Link key={href} href={href} className="border border-border bg-panel px-3 py-1.5 text-sm">{label}</Link>)}
      </nav>
    </div>
  );
}

function MoverList({ title, rows }: { title: string; rows: Mover[] }) {
  return (
    <div className="border border-border bg-panel">
      <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="px-3 py-3 text-sm text-muted">Quotes are not available.</p> : null}
      {rows.map((row) => (
        <Link key={row.symbol} href={`/terminal?symbol=${row.symbol}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-border px-3 py-2 text-sm hover:bg-elevated">
          <span><b>{row.symbol}</b> <span className="block text-xs text-muted">{row.name}</span></span>
          <span className="font-mono">{row.last}</span>
          <span className={`font-mono ${row.percent > 0 ? "text-profit" : row.percent < 0 ? "text-loss" : "text-muted"}`}>{row.percent > 0 ? "+" : ""}{row.percent.toFixed(2)}%</span>
        </Link>
      ))}
    </div>
  );
}

function donut(items: Array<{ percent: string }>) {
  const colors = [themeColor("--primary", "#D4AF37"), themeColor("--profit", "#10B981"), themeColor("--warning", "#D4AF37"), themeColor("--loss", "#EF4444"), themeColor("--muted", "#94A3B8"), "#8B7AA8"];
  let cursor = 0;
  const stops = items.map((item, index) => {
    const value = Math.max(0, Number.parseFloat(item.percent) || 0);
    const start = cursor;
    cursor += value;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}
