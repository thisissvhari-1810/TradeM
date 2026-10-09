"use client";

import { useEffect, useState } from "react";
import { api, tone } from "@/components/api";
import { ChartPanel, type Candle } from "@/components/chart-panel";

type Instrument = { symbol: string; name: string; exchange: string; sector: string };
type Quote = { symbol: string; last: string; bid: string; ask: string; open: string; high: string; low: string; previousClose: string; volume: string; asOf: string; mode: string; source: string; marketOpen: boolean; message: string };
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
  monthlyReturn: string | null;
  allTimeReturn: string;
  performanceReturn: string;
  stale: boolean;
  valuationMessage: string;
  positions: Array<{ symbol: string; name: string; quantity: number; averageCost: string; mark: string | null; marketValue: string | null; unrealized: string | null; realized: string }>;
  allocation: Array<{ label: string; percent: string }>;
};
type OrderResult = { status: string; message?: string | null; averageFill?: string | null; dataMode?: string | null; replayed?: boolean };

export function Terminal() {
  const [query, setQuery] = useState("");
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [symbol, setSymbol] = useState("RELIANCE");
  const [timeframe, setTimeframe] = useState<"5m" | "15m" | "1h" | "1d">("1d");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioError, setPortfolioError] = useState("");
  const [watchlist, setWatchlist] = useState<Array<{ symbol: string; name: string }>>([]);
  const [showSma, setShowSma] = useState(true);
  const [oscillator, setOscillator] = useState<"none" | "rsi" | "macd">("rsi");
  const [loading, setLoading] = useState(true);

  async function loadPortfolio() {
    try {
      setPortfolio(await api<Portfolio>("/api/portfolio"));
      setPortfolioError("");
    } catch (error) {
      setPortfolioError(error instanceof Error ? error.message : "Portfolio unavailable.");
    }
  }

  useEffect(() => {
    api<Instrument[]>(`/api/instruments?q=${encodeURIComponent(query)}`).then(setInstruments).catch(() => setInstruments([]));
  }, [query]);

  useEffect(() => {
    let stop = false;
    async function loadQuote() {
      try {
        const next = await api<Quote>(`/api/market/quote?symbol=${symbol}`);
        if (!stop) {
          setQuote(next);
          setQuoteError("");
        }
      } catch (error) {
        if (!stop) setQuoteError(error instanceof Error ? error.message : "Quote unavailable.");
      }
    }
    loadQuote();
    const timer = window.setInterval(loadQuote, 15000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [symbol]);

  useEffect(() => {
    api<{ candles: Candle[] }>(`/api/market/candles?symbol=${symbol}&timeframe=${timeframe}`)
      .then((result) => setCandles(result.candles))
      .catch(() => setCandles([]));
  }, [symbol, timeframe]);

  useEffect(() => {
    let ignore = false;
    api<Portfolio>("/api/portfolio").then((result) => { if (!ignore) { setPortfolio(result); setPortfolioError(""); } }).catch((error) => { if (!ignore) setPortfolioError(error instanceof Error ? error.message : "Portfolio unavailable."); }).finally(() => { if (!ignore) setLoading(false); });
    api<Array<{ symbol: string; name: string }>>("/api/workspace?view=watchlist").then((result) => { if (!ignore) setWatchlist(result); }).catch(() => { if (!ignore) setWatchlist([]); });
    return () => { ignore = true; };
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <section className="rounded-xl border border-border bg-panel p-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol or name" className="w-full rounded border border-border bg-elevated px-3 py-2 text-sm" />
        <div className="mt-3 max-h-[70vh] space-y-1 overflow-auto">
          {instruments.length === 0 ? <p className="text-sm text-muted">No instruments.</p> : null}
          {instruments.map((instrument) => (
            <button key={instrument.symbol} onClick={() => setSymbol(instrument.symbol)} className={`block w-full rounded px-2 py-2 text-left text-sm ${symbol === instrument.symbol ? "bg-elevated" : ""}`}>
              <span className="font-medium">{instrument.symbol}</span>
              <span className="mt-0.5 block text-xs text-muted">{instrument.name}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="min-w-0 space-y-4">
        <div className="rounded-xl border border-border bg-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{symbol}</h1>
              <p className="font-mono text-2xl">{quote ? `₹${quote.last}` : "—"}</p>
              <p className="text-xs text-muted">{quote ? `Bid ₹${quote.bid} · Ask ₹${quote.ask}` : quoteError || "Waiting for a quote"}</p>
            </div>
            <DataBadge quote={quote} error={quoteError} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {(["5m", "15m", "1h", "1d"] as const).map((item) => (
              <button key={item} onClick={() => setTimeframe(item)} className={`rounded border border-border px-2 py-1 ${timeframe === item ? "bg-elevated" : ""}`}>{item}</button>
            ))}
            <button onClick={() => setShowSma((value) => !value)} className={`rounded border border-border px-2 py-1 ${showSma ? "bg-elevated" : ""}`}>SMA</button>
            <button onClick={() => setOscillator("rsi")} className={`rounded border border-border px-2 py-1 ${oscillator === "rsi" ? "bg-elevated" : ""}`}>RSI</button>
            <button onClick={() => setOscillator("macd")} className={`rounded border border-border px-2 py-1 ${oscillator === "macd" ? "bg-elevated" : ""}`}>MACD</button>
          </div>
          <div className="mt-3">
            <ChartPanel candles={candles} showSma={showSma} showRsi={oscillator === "rsi"} showMacd={oscillator === "macd"} />
          </div>
        </div>
        <Wallet portfolio={portfolio} error={portfolioError} loading={loading} />
      </section>
      <OrderTicket symbol={symbol} quote={quote} onFilled={loadPortfolio} onWatch={() => api("/api/workspace", { action: "watchlist", symbol }).then(() => api<Array<{ symbol: string; name: string }>>("/api/workspace?view=watchlist").then(setWatchlist))} watchlist={watchlist} onSelect={setSymbol} />
    </div>
  );
}

function DataBadge({ quote, error }: { quote: Quote | null; error: string }) {
  if (error) return <p className="max-w-xs text-xs text-loss">{error}</p>;
  if (!quote) return <p className="text-xs text-muted">Loading quote…</p>;
  return (
    <div className="max-w-sm text-right text-xs text-muted">
      <p className="font-medium text-text">{quote.mode} · {quote.marketOpen ? "Market open" : "Market closed"}</p>
      <p>Updated {new Date(quote.asOf).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
      <p>{quote.message}</p>
    </div>
  );
}

function Wallet({ portfolio, error, loading }: { portfolio: Portfolio | null; error: string; loading: boolean }) {
  if (loading) return <p className="text-sm text-muted">Loading wallet…</p>;
  if (error) return <p className="rounded border border-loss/40 p-3 text-sm text-loss">{error}</p>;
  if (!portfolio) return null;
  const cards = [
    ["Starting capital", portfolio.startingCapital],
    ["Available cash", portfolio.cashAvailable],
    ["Reserved cash", portfolio.cashReserved],
    ["Holdings", portfolio.holdingsValue],
    ["Equity", portfolio.equity],
    ["Realized P&L", portfolio.realized],
    ["Unrealized P&L", portfolio.unrealized],
    ["Charges", portfolio.charges],
    ["Today", portfolio.dailyReturn ?? "—"],
    ["This month", portfolio.monthlyReturn ?? "—"],
    ["All-time", portfolio.allTimeReturn],
    ["Performance", portfolio.performanceReturn],
  ];
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted">{label}</p>
            <p className={`font-mono text-sm ${tone(value)}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{portfolio.stale ? "Stale or incomplete valuation. " : ""}{portfolio.valuationMessage}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>Mark</th><th>Value</th><th>Unrealized</th></tr></thead>
          <tbody>
            {portfolio.positions.length === 0 ? <tr><td colSpan={6} className="py-3 text-muted">No holdings in this practice period.</td></tr> : null}
            {portfolio.positions.map((position) => (
              <tr key={position.symbol} className="border-t border-border">
                <td className="py-2">{position.symbol}</td>
                <td>{position.quantity}</td>
                <td className="font-mono">₹{position.averageCost}</td>
                <td className="font-mono">{position.mark ? `₹${position.mark}` : "—"}</td>
                <td className="font-mono">{position.marketValue ? `₹${position.marketValue}` : "—"}</td>
                <td className={`font-mono ${tone(position.unrealized)}`}>{position.unrealized ? `₹${position.unrealized}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OrderTicket({ symbol, quote, onFilled, onWatch, watchlist, onSelect }: { symbol: string; quote: Quote | null; onFilled: () => Promise<void>; onWatch: () => Promise<void>; watchlist: Array<{ symbol: string; name: string }>; onSelect: (symbol: string) => void }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" | "TARGET">("MARKET");
  const [quantity, setQuantity] = useState("1");
  const [limit, setLimit] = useState("");
  const [stop, setStop] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [target, setTarget] = useState("");
  const [condition, setCondition] = useState<"PRICE_ABOVE" | "PRICE_BELOW">("PRICE_ABOVE");

  async function submit() {
    setPending(true);
    setError("");
    setResult("");
    try {
      const response = await api<OrderResult>("/api/orders", {
        symbol,
        side,
        type,
        quantity: Number(quantity),
        limitRupees: limit || undefined,
        stopRupees: stop || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setResult(response.message || response.status);
      setConfirming(false);
      await onFilled();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Order failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-border bg-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Order ticket</h2>
          <button className="text-xs text-muted" onClick={() => onWatch().catch((caught) => setError(caught.message))}>Add to watchlist</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["BUY", "SELL"] as const).map((item) => (
            <button key={item} onClick={() => setSide(item)} className={`rounded px-3 py-2 text-sm ${side === item ? (item === "BUY" ? "bg-profit text-background" : "bg-loss text-white") : "bg-elevated"}`}>{item}</button>
          ))}
        </div>
        <label className="mt-3 block text-xs text-muted">Type
          <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="mt-1 w-full rounded border border-border bg-elevated px-2 py-2 text-sm text-text">
            {["MARKET", "LIMIT", "STOP", "STOP_LIMIT", "TARGET"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-xs text-muted">Quantity
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" />
        </label>
        {type !== "MARKET" && type !== "STOP" ? <label className="mt-3 block text-xs text-muted">{type === "TARGET" ? "Target price" : "Limit price"}<input value={limit} onChange={(event) => setLimit(event.target.value)} className="mt-1 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" placeholder="₹" /></label> : null}
        {type === "STOP" || type === "STOP_LIMIT" ? <label className="mt-3 block text-xs text-muted">Stop price<input value={stop} onChange={(event) => setStop(event.target.value)} className="mt-1 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" /></label> : null}
        <p className="mt-3 text-xs text-muted">Risk: a simulated loss can reduce virtual equity. Position size and charges are controlled by the administrator.</p>
        {error ? <p className="mt-2 text-sm text-loss">{error}</p> : null}
        {result ? <p className="mt-2 text-sm text-profit">{result}</p> : null}
        {confirming ? (
          <div className="mt-3 rounded border border-border bg-elevated p-3 text-sm">
            <p>Submit a simulated {side} {type} for {quantity} {symbol}? No brokerage receives this order. {quote ? `Data mode: ${quote.mode}.` : "No fresh quote is loaded."}</p>
            <div className="mt-2 flex gap-2">
              <button disabled={pending} onClick={submit} className="rounded bg-primary px-3 py-1.5 text-white">{pending ? "Submitting…" : "Confirm"}</button>
              <button onClick={() => setConfirming(false)} className="rounded border border-border px-3 py-1.5">Back</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="mt-4 w-full rounded bg-primary px-3 py-2 text-sm text-white">Review order</button>
        )}
      </section>
      <section className="rounded-xl border border-border bg-panel p-4">
        <h2 className="text-sm font-medium">Watchlist</h2>
        {watchlist.length === 0 ? <p className="mt-2 text-sm text-muted">No symbols yet.</p> : null}
        {watchlist.map((item) => (
          <button key={item.symbol} onClick={() => onSelect(item.symbol)} className="mt-2 block text-sm">{item.symbol}</button>
        ))}
        <h2 className="mt-4 text-sm font-medium">Price alert</h2>
        <select value={condition} onChange={(event) => setCondition(event.target.value as typeof condition)} className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2 text-sm">
          <option value="PRICE_ABOVE">Price above</option>
          <option value="PRICE_BELOW">Price below</option>
        </select>
        <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Target ₹" className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" />
        <button
          className="mt-2 text-sm text-primary"
          onClick={() => api("/api/workspace", { action: "alert", symbol, condition, targetRupees: target }).then(() => setResult("Alert saved.")).catch((caught) => setError(caught.message))}
        >
          Save alert
        </button>
      </section>
    </aside>
  );
}
