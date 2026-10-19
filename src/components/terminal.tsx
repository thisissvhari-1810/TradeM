"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, tone } from "@/components/api";
import { ChartPanel, type Candle, type ChartHandle, type ChartType, type Drawing, type DrawTool } from "@/components/chart-panel";
import { loadDrawings, saveDrawings } from "@/components/drawing-model";
import { calculateCharges } from "@/lib/trading/fees";
import { formatInr, paiseToRupees, rupeesToPaise } from "@/lib/money";
import { DEFAULT_CHARGES } from "@/lib/trading/settings";
import { applyLiveTick, CHART_SPANS, SPAN_LABEL, type ChartSpan } from "@/lib/market/spans";
import { applyDemoFill, demoUnrealized, emptyDemoBook, formatDemoRupees, formatIst, initialPlayhead, loadDemoBook, revealLimit, sliceTo, stepPlayhead, type DemoBook } from "@/lib/trading/demo-replay";

type Instrument = { symbol: string; name: string; exchange: string; sector: string };
type Quote = { symbol: string; last: string; bid: string; ask: string; open: string; high: string; low: string; previousClose: string; volume: string; asOf: string; mode: string; source: string; marketOpen: boolean; message: string };
type Slot = { symbol: string; timeframe: ChartSpan };
type WatchItem = { symbol: string; name: string; exchange?: string };
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
  positions: Array<{ symbol: string; name: string; quantity: number; averageCost: string; mark: string | null; marketValue: string | null; unrealized: string | null; realized: string }>;
};
type Activity = {
  orders: Array<{ id: string; symbol: string; side: string; type: string; quantity: number; filledQuantity: number; status: string; limit: string | null; avgFill: string | null; reason: string | null; submittedAt: string }>;
  executions: Array<{ id: string; symbol: string; side: string; quantity: number; price: string; charges: string; realized: string; mode: string; executedAt: string }>;
  ledger: Array<{ id: string; type: string; cashDelta: string; reason: string; createdAt: string }>;
};
type Analytics = { winRate: string; averageWin: string; averageLoss: string; profitFactor: string; maxDrawdown: string; wins: number; losses: number; disclaimer: string };
type Journal = { id: string; thesis: string; lesson: string; createdAt: string; symbol: string | null };
type ClosedRow = { id: string; symbol: string; name: string; exitAt: string; quantity: number; averageEntry: string; averageExit: string; net: string; ret: string };

type RailTool = DrawTool | "magnet" | "lock" | "hide" | "trash";
const GROUPS: Array<{ id: string; tools: Array<[RailTool, string]> }> = [
  { id: "cursor", tools: [["cursor", "Crosshair"]] },
  { id: "lines", tools: [["trend", "Trend line"], ["ray", "Ray"], ["extended", "Extended line"], ["hline", "Horizontal line"], ["hray", "Horizontal ray"], ["vline", "Vertical line"], ["channel", "Parallel channel"], ["angle", "Trend angle"]] },
  { id: "range", tools: [["range", "Date and Price Range"]] },
  { id: "fib", tools: [["fib", "Fibonacci retracement"], ["fibext", "Fibonacci extension"], ["fibtime", "Fibonacci time zones"], ["measure", "Measure"]] },
  { id: "shapes", tools: [["rect", "Rectangle"], ["ellipse", "Ellipse"], ["triangle", "Triangle"], ["path", "Path"], ["brush", "Brush"], ["arrow", "Arrow"]] },
  { id: "position", tools: [["long", "Long position"], ["short", "Short position"]] },
  { id: "notes", tools: [["text", "Text"], ["note", "Note"], ["price", "Price label"], ["callout", "Callout"], ["marker", "Marker"]] },
  { id: "forecast", tools: [["forecast", "Forecast"], ["bars", "Bars pattern"], ["ghost", "Ghost feed"], ["projection", "Projection"], ["avwap", "Anchored VWAP"], ["vprofile", "Volume profile"]] },
  { id: "view", tools: [["zoom", "Zoom"], ["magnet", "Magnet"], ["lock", "Lock drawings"], ["hide", "Hide drawings"]] },
  { id: "erase", tools: [["trash", "Delete drawing"]] },
];

export function Terminal() {
  const [query, setQuery] = useState("");
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [catalog, setCatalog] = useState<Instrument[]>([]);
  const [slots, setSlots] = useState<Slot[]>([
    { symbol: "RELIANCE", timeframe: "1d" },
    { symbol: "TCS", timeframe: "1d" },
    { symbol: "INFY", timeframe: "1d" },
    { symbol: "HDFCBANK", timeframe: "1d" },
  ]);
  const [active, setActive] = useState(0);
  const [layout, setLayout] = useState<1 | 2 | 4>(1);
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [showSma, setShowSma] = useState(false);
  const [showEma, setShowEma] = useState(false);
  const [showBands, setShowBands] = useState(false);
  const [showVwap, setShowVwap] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [oscillator, setOscillator] = useState<"none" | "rsi" | "macd">("none");
  const [tool, setTool] = useState<DrawTool>("cursor");
  const [chartScheme, setChartScheme] = useState<"dark" | "light">("dark");
  const [schemeReady, setSchemeReady] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const [isFull, setIsFull] = useState(false);
  const [indicatorQuery, setIndicatorQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [magnet, setMagnet] = useState(false);
  const [hideDrawings, setHideDrawings] = useState(false);
  const [command, setCommand] = useState<{ id: number; name: "lock" | "trash" | "color" } | null>(null);
  const undoRef = useRef<Record<string, Drawing[][]>>({});
  const redoRef = useRef<Record<string, Drawing[][]>>({});
  const [annotation, setAnnotation] = useState("");
  const [drawings, setDrawings] = useState<Record<string, Drawing[]>>({});
  const drawingsStateRef = useRef(drawings);
  const [compareSymbol, setCompareSymbol] = useState("");
  const [showWatch, setShowWatch] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [tradeSide, setTradeSide] = useState<"BUY" | "SELL">("BUY");
  const [demoOn, setDemoOn] = useState(false);
  const [delayMin, setDelayMin] = useState(60);
  const [customDelay, setCustomDelay] = useState("90");
  const [practice, setPractice] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [series, setSeries] = useState<Candle[]>([]);
  const [hovered, setHovered] = useState<Candle | null>(null);
  const [demoBook, setDemoBook] = useState<DemoBook>(emptyDemoBook());
  const [demoReady, setDemoReady] = useState(false);
  const [focusToken, setFocusToken] = useState(0);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const seriesRef = useRef<Candle[]>([]);
  const playheadRef = useRef<number | null>(null);
  const quoteRef = useRef<Quote | null>(null);
  const appliedReset = useRef("");
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [watchQuery, setWatchQuery] = useState("");
  const [quotes, setQuotes] = useState<Record<string, Quote | null>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioError, setPortfolioError] = useState("");
  const [activity, setActivity] = useState<Activity | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [notes, setNotes] = useState<Journal[]>([]);
  const [closed, setClosed] = useState<ClosedRow[]>([]);
  const [dock, setDock] = useState<"overview" | "positions" | "orders" | "trades" | "history" | "account" | "performance" | "notes">("positions");
  const [dockHeight, setDockHeight] = useState(210);
  const [mobile, setMobile] = useState<"chart" | "watch" | "trade" | "book">("chart");
  const [menu, setMenu] = useState<"indicators" | "symbol" | "type" | "layout" | "alert" | null>(null);
  const [alertTarget, setAlertTarget] = useState("");
  const [alertCondition, setAlertCondition] = useState<"PRICE_ABOVE" | "PRICE_BELOW">("PRICE_ABOVE");
  const [alertMessage, setAlertMessage] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ChartHandle | null>(null);
  const slot = slots[active];
  drawingsStateRef.current = drawings;

  useEffect(() => {
    const saved = localStorage.getItem("tl-chart-scheme");
    if (saved === "light") setChartScheme("light");
    setSchemeReady(true);
  }, []);
  useEffect(() => {
    if (schemeReady) localStorage.setItem("tl-chart-scheme", chartScheme);
  }, [chartScheme, schemeReady]);
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const apply = () => {
      const requested = new URLSearchParams(window.location.search).get("symbol");
      if (!requested) return;
      setSlots((current) => current.map((item, index) => (index === 0 ? { ...item, symbol: requested.toUpperCase() } : item)));
      setActive(0);
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);
  useEffect(() => {
    setDrawings((current) => {
      if (current[slot.symbol]) return current;
      const next = { ...current, [slot.symbol]: loadDrawings(slot.symbol) };
      drawingsStateRef.current = next;
      return next;
    });
  }, [slot.symbol]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undoDrawings(); }
      if (meta && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"))) { event.preventDefault(); redoDrawings(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => {
    if (drawings[slot.symbol]) saveDrawings(slot.symbol, drawings[slot.symbol]);
  }, [drawings, slot.symbol]);

  useEffect(() => {
    api<Instrument[]>(`/api/instruments?q=${encodeURIComponent(query)}`).then(setInstruments).catch(() => setInstruments([]));
  }, [query]);
  useEffect(() => {
    api<Instrument[]>("/api/instruments").then(setCatalog).catch(() => setCatalog([]));
  }, []);

  function loadBook() {
    api<Portfolio>("/api/portfolio").then((result) => { setPortfolio(result); setPortfolioError(""); }).catch((error) => setPortfolioError(error instanceof Error ? error.message : "Portfolio unavailable."));
    api<Activity>("/api/orders").then(setActivity).catch(() => setActivity(null));
    api<ClosedRow[]>("/api/trades").then(setClosed).catch(() => setClosed([]));
  }

  useEffect(() => {
    loadBook();
    api<WatchItem[]>("/api/workspace?view=watchlist").then(setWatchlist).catch(() => setWatchlist([]));
  }, []);

  useEffect(() => {
    if (dock !== "performance") return;
    api<Analytics>("/api/workspace?view=analytics").then(setAnalytics).catch(() => setAnalytics(null));
  }, [dock]);

  useEffect(() => {
    if (dock !== "notes") return;
    api<Journal[]>("/api/workspace").then(setNotes).catch(() => setNotes([]));
  }, [dock]);

  useEffect(() => {
    let stop = false;
    async function loadQuote() {
      try {
        const next = await api<Quote>(`/api/market/quote?symbol=${slot.symbol}`);
        if (!stop) { setQuote(next); setQuoteError(""); }
      } catch (error) {
        if (!stop) setQuoteError(error instanceof Error ? error.message : "Quote unavailable.");
      }
    }
    loadQuote();
    const timer = window.setInterval(loadQuote, 2000);
    return () => { stop = true; window.clearInterval(timer); };
  }, [slot.symbol]);

  useEffect(() => {
    setDemoBook(loadDemoBook(localStorage.getItem("tl-demo-book")));
    setDemoReady(true);
  }, []);
  useEffect(() => {
    if (demoReady) localStorage.setItem("tl-demo-book", JSON.stringify(demoBook));
  }, [demoBook, demoReady]);
  useEffect(() => {
    if (!demoOn) return;
    setNowSec(Math.floor(Date.now() / 1000));
    const timer = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 5000);
    return () => window.clearInterval(timer);
  }, [demoOn]);

  useEffect(() => {
    if (!watchlist.length) return;
    let stop = false;
    async function load() {
      const entries = await Promise.all(watchlist.map(async (item) => {
        try { return [item.symbol, await api<Quote>(`/api/market/quote?symbol=${item.symbol}`)] as const; }
        catch { return [item.symbol, null] as const; }
      }));
      if (!stop) setQuotes(Object.fromEntries(entries));
    }
    load();
    const timer = window.setInterval(load, 20000);
    return () => { stop = true; window.clearInterval(timer); };
  }, [watchlist]);

  function selectSymbol(symbol: string) {
    const next = symbol.toUpperCase();
    setSlots((current) => current.map((item, index) => (index === active ? { ...item, symbol: next } : item)));
    const url = new URL(window.location.href);
    url.searchParams.set("symbol", next);
    window.history.pushState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
    setMobile("chart");
  }

  function putDrawings(symbol: string, next: Drawing[], undo = false) {
    if (undo) {
      undoRef.current[symbol] = [...(undoRef.current[symbol] ?? []), drawingsStateRef.current[symbol] ?? []].slice(-40);
      redoRef.current[symbol] = [];
      setHistoryTick((value) => value + 1);
    }
    const stored = { ...drawingsStateRef.current, [symbol]: next };
    drawingsStateRef.current = stored;
    setDrawings(stored);
  }

  function undoDrawings() {
    const stack = undoRef.current[slot.symbol];
    if (!stack?.length) return;
    const prev = stack.pop();
    if (!prev) return;
    redoRef.current[slot.symbol] = [...(redoRef.current[slot.symbol] ?? []), drawingsStateRef.current[slot.symbol] ?? []];
    const stored = { ...drawingsStateRef.current, [slot.symbol]: prev };
    drawingsStateRef.current = stored;
    setDrawings(stored);
    setHistoryTick((value) => value + 1);
  }

  function redoDrawings() {
    const stack = redoRef.current[slot.symbol];
    if (!stack?.length) return;
    const next = stack.pop();
    if (!next) return;
    undoRef.current[slot.symbol] = [...(undoRef.current[slot.symbol] ?? []), drawingsStateRef.current[slot.symbol] ?? []];
    const stored = { ...drawingsStateRef.current, [slot.symbol]: next };
    drawingsStateRef.current = stored;
    setDrawings(stored);
    setHistoryTick((value) => value + 1);
  }

  function chooseRail(id: RailTool) {
    if (id === "magnet") setMagnet((value) => !value);
    else if (id === "hide") setHideDrawings((value) => !value);
    else if (id === "lock" || id === "trash") setCommand({ id: Date.now(), name: id });
    else setTool(id);
  }

  function refreshWatch() {
    api<WatchItem[]>("/api/workspace?view=watchlist").then(setWatchlist).catch(() => setWatchlist([]));
  }

  const visible = slots.slice(0, layout);
  const filteredWatch = watchlist.filter((item) => `${item.symbol} ${item.name}`.toLowerCase().includes(watchQuery.toLowerCase()));
  const meta = catalog.find((item) => item.symbol === slot.symbol);
  const selectedMark = (drawings[slot.symbol] ?? []).find((item) => item.id === selectedDrawing) ?? null;
  const canUndo = historyTick >= 0 && (undoRef.current[slot.symbol]?.length ?? 0) > 0;
  const canRedo = historyTick >= 0 && (redoRef.current[slot.symbol]?.length ?? 0) > 0;
  const delta = quote ? Number(quote.last) - Number(quote.previousClose) : 0;
  const deltaPct = quote && Number(quote.previousClose) ? (delta / Number(quote.previousClose)) * 100 : 0;
  const delaySec = delayMin * 60;
  const marketOpen = Boolean(quote?.marketOpen);
  seriesRef.current = series;
  playheadRef.current = playhead;
  quoteRef.current = quote;
  const replayLimit = demoOn ? revealLimit(series, nowSec, marketOpen, delaySec) : null;
  const visibleUntil = !demoOn ? null : practice ? (playhead ?? replayLimit ?? 0) : (replayLimit ?? 0);
  const playheadCandle = playhead == null ? null : series.find((candle) => candle.time === playhead) ?? null;
  const legendCandle = hovered ?? (demoOn ? playheadCandle : null);
  const intraday = slot.timeframe === "1m" || slot.timeframe === "3m" || slot.timeframe === "5m" || slot.timeframe === "1h";

  useEffect(() => {
    if (!demoOn) { appliedReset.current = ""; setPlaying(false); return; }
    if (!series.length) return;
    const key = `${delaySec}:${slot.symbol}:${slot.timeframe}:${quote?.marketOpen ? "open" : "closed"}`;
    if (appliedReset.current === key && playhead != null && series.some((candle) => candle.time === playhead)) return;
    appliedReset.current = key;
    setPlayhead(initialPlayhead(series, Math.floor(Date.now() / 1000), quote?.marketOpen ?? false, delaySec));
    setPlaying(false);
    setFocusToken((value) => value + 1);
  }, [demoOn, delaySec, series, playhead, slot.symbol, slot.timeframe, quote?.marketOpen]);

  useEffect(() => {
    if (!demoOn || !playing) return;
    const timer = window.setInterval(() => {
      const rows = seriesRef.current;
      const open = quoteRef.current?.marketOpen ?? false;
      const limit = revealLimit(rows, Math.floor(Date.now() / 1000), open, delaySec);
      const next = stepPlayhead(rows, playheadRef.current, 1, limit);
      if (next == null || next === playheadRef.current) { setPlaying(false); return; }
      setPlayhead(next);
    }, Math.max(140, Math.round(900 / speed)));
    return () => window.clearInterval(timer);
  }, [demoOn, playing, speed, delaySec]);

  useEffect(() => {
    if (!demoOn || playhead == null || replayLimit == null || playhead <= replayLimit) return;
    setPlayhead(replayLimit);
  }, [demoOn, playhead, replayLimit]);
  useEffect(() => { setHovered(null); }, [slot.symbol, slot.timeframe]);

  function moveReplay(direction: -1 | 1) {
    const limit = revealLimit(seriesRef.current, Math.floor(Date.now() / 1000), quoteRef.current?.marketOpen ?? false, delaySec);
    setPlaying(false);
    setPlayhead((current) => stepPlayhead(seriesRef.current, current, direction, limit));
  }

  function resetReplay() {
    setPlaying(false);
    setPlayhead(initialPlayhead(series, Math.floor(Date.now() / 1000), marketOpen, delaySec));
    setFocusToken((value) => value + 1);
  }

  return (
    <div className={`flex h-full min-h-0 flex-col bg-panel text-text ${chartScheme === "light" ? "chart-light" : ""}`}>
      <header className="relative shrink-0 border-b border-border bg-elevated">
        <div className="flex h-10 items-center">
        <div className="no-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto px-2">
          <Link href="/dashboard" className="grid h-5 w-5 shrink-0 place-items-center bg-primary text-[10px] font-semibold text-on-primary" aria-label="Home">T</Link>
          <button className={barButton(menu === "symbol")} onClick={() => setMenu((value) => value === "symbol" ? null : "symbol")}>{slot.symbol}</button>
          <button className={barButton(false)} title="Compare" onClick={() => setMenu((value) => value === "symbol" ? null : "symbol")}>+</button>
          <span className="mx-0.5 h-3 w-px shrink-0 bg-border" />
          <button className={barButton(menu === "type")} title={chartType === "candle" ? "Candles" : chartType === "bar" ? "Bars" : chartType === "line" ? "Line" : "Area"} aria-label={chartType === "candle" ? "Candles" : chartType === "bar" ? "Bars" : chartType === "line" ? "Line" : "Area"} onClick={() => setMenu((value) => value === "type" ? null : "type")}><BarGlyph name={chartType === "bar" ? "bars" : chartType === "line" ? "line" : chartType === "area" ? "area" : "candles"} /></button>
          <button className={barButton(menu === "indicators")} title="Indicators" aria-label="Indicators" onClick={() => setMenu((value) => value === "indicators" ? null : "indicators")}><BarGlyph name="indicators" /></button>
          <button className={barButton(menu === "layout")} title="Layout" aria-label="Layout" onClick={() => setMenu((value) => value === "layout" ? null : "layout")}><BarGlyph name="layout" /></button>
          <button className={barButton(menu === "alert")} title="Alert" aria-label="Alert" onClick={() => setMenu((value) => value === "alert" ? null : "alert")}><BarGlyph name="alert" /></button>
          <button className={barButton(false, !canUndo)} title="Undo" aria-label="Undo" disabled={!canUndo} onClick={undoDrawings}><BarGlyph name="undo" /></button>
          <button className={barButton(false, !canRedo)} title="Redo" aria-label="Redo" disabled={!canRedo} onClick={redoDrawings}><BarGlyph name="redo" /></button>
          <span className="mx-0.5 h-3 w-px shrink-0 bg-border" />
          <button className={barButton(false)} title="Save chart image" aria-label="Image" onClick={() => handleRef.current?.png(slot.symbol)}><BarGlyph name="image" /></button>
          <button className={barButton(isFull)} title={isFull ? "Exit full screen" : "Full screen"} aria-label={isFull ? "Exit full screen" : "Full screen"} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void stageRef.current?.requestFullscreen(); }}><BarGlyph name="full" /></button>
          <button className={barButton(showWatch)} title="Watchlist" aria-label="Watchlist" onClick={() => { setShowWatch((value) => !value); setMobile("watch"); }}><BarGlyph name="watchlist" /></button>
          <button className={barButton(showBook)} title="Positions" aria-label="Positions" onClick={() => { setShowBook((value) => !value); setMobile("book"); }}><BarGlyph name="positions" /></button>
        </div>
        <div className="flex w-1/2 shrink-0 items-center justify-center gap-1">
          <button className={`h-7 min-w-16 shrink-0 border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary ${demoOn ? "border-primary bg-primary text-on-primary" : "border-primary bg-transparent text-primary hover:bg-primary hover:text-on-primary"}`} aria-pressed={demoOn} onClick={() => setDemoOn((on) => !on)}>Demo</button>
          <button className={`h-7 min-w-16 shrink-0 border px-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary ${showRight ? "border-primary bg-primary text-on-primary" : "border-primary/70 bg-primary/15 text-primary hover:border-primary hover:bg-primary hover:text-on-primary"}`} aria-pressed={showRight} onClick={() => { setShowRight((open) => { setMobile(open ? "chart" : "trade"); return !open; }); }}>Trade</button>
          <button className={barButton(chartScheme === "light")} title={chartScheme === "dark" ? "Light chart" : "Dark chart"} aria-label={chartScheme === "dark" ? "Switch chart to light" : "Switch chart to dark"} aria-pressed={chartScheme === "dark"} onClick={() => setChartScheme((value) => value === "dark" ? "light" : "dark")}>
            <SchemeIcon mode={chartScheme} />
          </button>
        </div>
        </div>
        {menu === "symbol" ? (
          <div className="absolute left-8 top-full z-40 w-72 border border-border bg-elevated p-2 shadow-none">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Symbol or company" aria-label="Search symbol" className="h-7 w-full border-[#363A45] px-2 text-xs" />
            <div className="mt-1 max-h-64 overflow-auto">
              {(query ? instruments : catalog).map((item) => (
                <button key={item.symbol} className="flex w-full items-center justify-between px-1 py-1 text-left text-xs hover:bg-border" onClick={() => { selectSymbol(item.symbol); setMenu(null); setQuery(""); }}>
                  <span><b>{item.name}</b> <span className="text-muted">{item.symbol}</span></span>
                </button>
              ))}
            </div>
            <label className="mt-2 block text-[11px] text-muted">Compare on the left scale
              <select aria-label="Compare" value={compareSymbol} onChange={(event) => setCompareSymbol(event.target.value)} className="mt-1 h-7 w-full px-1 text-xs">
                <option value="">None</option>
                {catalog.filter((item) => item.symbol !== slot.symbol).map((item) => <option key={item.symbol} value={item.symbol}>{item.name}</option>)}
              </select>
            </label>
          </div>
        ) : null}
        {menu === "type" ? (
          <div className="absolute left-48 top-full z-40 border border-border bg-elevated p-1">
            {(["candle", "bar", "line", "area"] as const).map((item) => (
              <button key={item} className={`block w-full px-3 py-1 text-left text-xs capitalize ${chartType === item ? "bg-border" : ""}`} onClick={() => { setChartType(item); setMenu(null); }}>{item === "candle" ? "Candles" : item === "bar" ? "Bars" : item === "line" ? "Line" : "Area"}</button>
            ))}
          </div>
        ) : null}
        {menu === "indicators" ? (
          <div className="absolute left-64 top-full z-40 flex w-56 flex-col items-start gap-1 border border-border bg-elevated p-2 text-xs">
            <input value={indicatorQuery} onChange={(event) => setIndicatorQuery(event.target.value)} placeholder="Search indicators" aria-label="Search indicators" className="mb-1 h-6 w-full px-1 text-[12px]" />
            <p className="mb-1 text-[11px] text-muted">Studies stay off until you turn one on. They describe past prices.</p>
            {[
              ["Volume", showVolume, setShowVolume],
              ["SMA 20 / 50", showSma, setShowSma],
              ["EMA 21", showEma, setShowEma],
              ["Bollinger 20", showBands, setShowBands],
              ["VWAP cumulative", showVwap, setShowVwap],
            ].filter(([label]) => String(label).toLowerCase().includes(indicatorQuery.trim().toLowerCase())).map(([label, on, set]) => (
              <Toggle key={String(label)} on={Boolean(on)} label={String(label)} set={set as (value: boolean) => void} />
            ))}
            {"rsi 14".includes(indicatorQuery.trim().toLowerCase()) ? <button className={`mt-1 ${barButton(oscillator === "rsi")}`} onClick={() => setOscillator((value) => value === "rsi" ? "none" : "rsi")}>RSI 14</button> : null}
            {"macd 12 26 9".includes(indicatorQuery.trim().toLowerCase()) ? <button className={`mt-1 ${barButton(oscillator === "macd")}`} onClick={() => setOscillator((value) => value === "macd" ? "none" : "macd")}>MACD 12 26 9</button> : null}
          </div>
        ) : null}
        {menu === "layout" ? (
          <div className="absolute left-[22rem] top-full z-40 border border-border bg-elevated p-2 text-xs">
            {([1, 2, 4] as const).map((count) => (
              <button key={count} className={`mr-1 ${barButton(layout === count)}`} onClick={() => { setLayout(count); if (active >= count) setActive(0); setMenu(null); }}>{count}</button>
            ))}
            <button className={`mt-2 block ${barButton(false)}`} onClick={() => { setLayout(1); setShowWatch(false); setShowRight(false); setShowBook(false); setChartType("candle"); setShowSma(false); setShowEma(false); setShowBands(false); setShowVwap(false); setShowVolume(false); setOscillator("none"); setTool("cursor"); setCompareSymbol(""); setMenu(null); }}>Restore chart</button>
          </div>
        ) : null}
        {menu === "alert" ? (
          <form className="absolute left-80 top-full z-40 w-56 border border-border bg-elevated p-2 text-xs" onSubmit={(event) => { event.preventDefault(); api("/api/workspace", { action: "alert", symbol: slot.symbol, condition: alertCondition, targetRupees: alertTarget }).then(() => setAlertMessage("Alert saved.")).catch((caught) => setAlertMessage(caught instanceof Error ? caught.message : "Could not save the alert.")); }}>
            <p className="text-muted">{slot.symbol}</p>
            <select value={alertCondition} onChange={(event) => setAlertCondition(event.target.value as typeof alertCondition)} className="mt-1 h-7 w-full px-1 text-xs">
              <option value="PRICE_ABOVE">Price above</option>
              <option value="PRICE_BELOW">Price below</option>
            </select>
            <input value={alertTarget} onChange={(event) => setAlertTarget(event.target.value)} placeholder="Target price" aria-label="Alert price" className="mt-1 h-7 w-full px-2 text-xs" />
            <button className="mt-2 h-7 bg-primary px-2 text-on-primary">Save alert</button>
            {alertMessage ? <p className="mt-1 text-muted">{alertMessage}</p> : null}
          </form>
        ) : null}
      </header>
      {demoOn ? (
        <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-elevated px-2 text-[11px]">
          <span className="shrink-0 bg-primary px-1.5 py-0.5 font-semibold text-on-primary">Demo</span>
          {([60, 120, 180] as const).map((minutes) => (
            <button key={minutes} className={`h-6 shrink-0 px-1.5 ${delayMin === minutes ? "bg-border text-text" : "text-muted"}`} onClick={() => setDelayMin(minutes)}>{minutes / 60}h behind</button>
          ))}
          <label className="flex shrink-0 items-center gap-1 text-muted">Custom
            <input value={customDelay} onChange={(event) => setCustomDelay(event.target.value)} aria-label="Custom delay minutes" className="h-6 w-14 px-1 text-[11px]" />
            <button className="h-6 px-1.5 text-text" onClick={() => { const minutes = Math.round(Number(customDelay)); if (Number.isFinite(minutes)) setDelayMin(Math.min(375, Math.max(15, minutes))); }}>min</button>
          </label>
          <span className="mx-0.5 h-3 w-px shrink-0 bg-border" />
          <button className="h-6 shrink-0 px-1.5 text-text" onClick={() => moveReplay(-1)}>Previous</button>
          <button className="h-6 shrink-0 bg-primary px-2 font-semibold text-on-primary" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button>
          <button className="h-6 shrink-0 px-1.5 text-text" onClick={() => moveReplay(1)}>Next</button>
          <button className="h-6 shrink-0 px-1.5 text-text" onClick={resetReplay}>Reset</button>
          <span className="mx-0.5 h-3 w-px shrink-0 bg-border" />
          <button className="h-6 shrink-0 px-1.5 text-text" title="Zoom out" onClick={() => handleRef.current?.zoom(-1)}>Zoom −</button>
          <button className="h-6 shrink-0 px-1.5 text-text" title="Zoom in" onClick={() => handleRef.current?.zoom(1)}>Zoom +</button>
          {([0.25, 0.5, 1, 2, 4, 8] as const).map((item) => (
            <button key={item} className={`h-6 shrink-0 px-1.5 ${speed === item ? "bg-border text-text" : "text-muted"}`} onClick={() => setSpeed(item)}>{item}x</button>
          ))}
          <button className={`h-6 shrink-0 px-1.5 ${practice ? "bg-border text-text" : "text-muted"}`} aria-pressed={practice} onClick={() => setPractice((value) => !value)}>{practice ? "Upcoming hidden" : "Upcoming visible"}</button>
          <span className="shrink-0 font-mono text-muted">{playheadCandle ? formatIst(playheadCandle.time) : "Waiting for candles"}{marketOpen ? "" : " · session closed"}</span>
          {intraday ? null : <span className="shrink-0 text-muted">Hour delays step through intraday bars. Choose 1m, 5m, or 1h.</span>}
          {demoOn && replayLimit == null ? <span className="shrink-0 text-muted">No candle is available at this delay.</span> : null}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <aside className={`${showWatch && (mobile === "watch" || mobile === "chart") ? "flex" : "hidden"} ${showWatch ? "lg:flex" : ""} w-full shrink-0 flex-col border-r border-border bg-panel lg:w-60 ${mobile === "watch" ? "" : "max-lg:hidden"}`}>
          <div className="border-b border-border p-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Symbol or company" aria-label="Search instruments" className="h-7 w-full px-2 text-xs" />
          </div>
          <div className="max-h-40 overflow-auto border-b border-border">
            {instruments.map((item) => (
              <button key={item.symbol} onClick={() => selectSymbol(item.symbol)} className="flex w-full items-center justify-between px-2 py-1 text-left text-xs hover:bg-elevated">
                <span><b>{item.name}</b> <span className="block text-muted">{item.symbol}</span></span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
            Watchlist
            <button className="normal-case tracking-normal text-primary" onClick={() => api("/api/workspace", { action: "watchlist", symbol: slot.symbol }).then(refreshWatch)}>Add {slot.symbol}</button>
          </div>
          <input value={watchQuery} onChange={(event) => setWatchQuery(event.target.value)} placeholder="Filter watchlist" aria-label="Filter watchlist" className="mx-2 mb-1 h-7 px-2 text-xs" />
          <div className="min-h-0 flex-1 overflow-auto">
            {filteredWatch.length === 0 ? <p className="px-2 py-2 text-xs text-muted">No saved symbols.</p> : null}
            {filteredWatch.map((item) => {
              const itemQuote = quotes[item.symbol];
              return (
                <div key={item.symbol} className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 px-2 py-1 text-xs ${item.symbol === slot.symbol ? "bg-elevated" : ""}`}>
                  <button className="text-left" onClick={() => selectSymbol(item.symbol)}>
                    <b>{item.symbol}</b>
                    <span className="block truncate text-muted">{item.name}</span>
                  </button>
                  <span className="text-right font-mono">{itemQuote ? itemQuote.last : "…"}<Change last={itemQuote?.last} previous={itemQuote?.previousClose} /></span>
                  <button aria-label={`Remove ${item.symbol}`} className="text-muted" onClick={() => api("/api/workspace", { action: "watchlist", symbol: item.symbol, remove: true }).then(refreshWatch)}>×</button>
                </div>
              );
            })}
          </div>
        </aside>
        <section ref={stageRef} className={`${mobile === "chart" || mobile === "watch" ? "flex" : "hidden"} relative min-w-0 flex-1 bg-panel lg:flex`}>
          <div className="no-scrollbar flex w-12 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-border bg-panel py-1">
            {GROUPS.map((group, index) => {
              const active = group.tools.some(([id]) => id === tool || (id === "magnet" && magnet) || (id === "hide" && hideDrawings));
              const [primary, primaryLabel] = group.tools[0];
              return (
                <span key={group.id} className="contents">
                  {index === 1 || index === 4 || index === 7 ? <span className="my-0.5 h-px w-6 bg-border" /> : null}
                  <button
                    title={group.tools.length > 1 ? `${primaryLabel}. Click again for related tools.` : primaryLabel}
                    aria-label={primaryLabel}
                    aria-pressed={active}
                    className={`grid h-9 w-9 shrink-0 place-items-center text-text ${active ? "bg-border" : "hover:bg-elevated"}`}
                    onClick={() => {
                      const inGroup = group.tools.some(([id]) => id === tool);
                      if (group.tools.length === 1 || !inGroup) { chooseRail(primary); setOpenGroup(null); return; }
                      setOpenGroup((value) => value === group.id ? null : group.id);
                    }}
                  >
                    <ToolIcon name={group.tools.find(([id]) => id === tool)?.[0] ?? primary} />
                  </button>
                </span>
              );
            })}
          </div>
          {openGroup ? (
            <div className="absolute left-12 top-2 z-40 w-60 border border-border bg-panel py-1">
              {GROUPS.find((group) => group.id === openGroup)?.tools.map(([id, label]) => (
                <button key={id} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${(id === tool || (id === "magnet" && magnet) || (id === "hide" && hideDrawings)) ? "bg-elevated" : "hover:bg-elevated"}`} onClick={() => { chooseRail(id); setOpenGroup(null); }}>
                  <ToolIcon name={id} />
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="relative flex min-w-0 flex-1 flex-col">
            {selectedMark ? (
              <div className="absolute right-2 top-2 z-20 w-56 border border-border bg-panel p-2 text-xs">
                <p className="font-semibold capitalize">{selectedMark.kind}</p>
                <div className="mt-2 flex gap-1">
                  {["#D4AF37", "#089981", "#F23645", "#F8FAFC"].map((color) => (
                    <button key={color} aria-label={`Colour ${color}`} className="h-5 w-5 border border-border" style={{ background: color }} onClick={() => putDrawings(slot.symbol, (drawings[slot.symbol] ?? []).map((item) => item.id === selectedMark.id ? { ...item, color } : item), true)} />
                  ))}
                </div>
                <div className="mt-2 flex gap-1">
                  {(["solid", "dashed", "dotted"] as const).map((dash) => (
                    <button key={dash} className={`px-1.5 py-1 ${selectedMark.dash === dash ? "bg-border" : ""}`} onClick={() => putDrawings(slot.symbol, (drawings[slot.symbol] ?? []).map((item) => item.id === selectedMark.id ? { ...item, dash } : item), true)}>{dash}</button>
                  ))}
                </div>
                <div className="mt-2 flex gap-1">
                  {[1.5, 2.5, 4].map((width) => (
                    <button key={width} className={`px-1.5 py-1 ${selectedMark.width === width ? "bg-border" : ""}`} onClick={() => putDrawings(slot.symbol, (drawings[slot.symbol] ?? []).map((item) => item.id === selectedMark.id ? { ...item, width } : item), true)}>{width}</button>
                  ))}
                </div>
                {selectedMark.text != null ? (
                  <input className="mt-2 w-full border border-border bg-background px-1 py-1" value={selectedMark.text} aria-label="Drawing text" onChange={(event) => putDrawings(slot.symbol, (drawings[slot.symbol] ?? []).map((item) => item.id === selectedMark.id ? { ...item, text: event.target.value } : item), true)} />
                ) : null}
                <div className="mt-2 flex gap-1">
                  <button className="border border-border px-2 py-1" onClick={() => putDrawings(slot.symbol, (drawings[slot.symbol] ?? []).map((item) => item.id === selectedMark.id ? { ...item, locked: !item.locked } : item), true)}>{selectedMark.locked ? "Unlock" : "Lock"}</button>
                  <button className="border border-border px-2 py-1" onClick={() => putDrawings(slot.symbol, (drawings[slot.symbol] ?? []).map((item) => item.id === selectedMark.id ? { ...item, hidden: !item.hidden } : item), true)}>{selectedMark.hidden ? "Show" : "Hide"}</button>
                  <button className="border border-border px-2 py-1" onClick={() => { putDrawings(slot.symbol, (drawings[slot.symbol] ?? []).filter((item) => item.id !== selectedMark.id), true); setSelectedDrawing(null); }}>Delete</button>
                </div>
              </div>
            ) : null}
            <div className="pointer-events-none absolute left-3 top-2 z-10 max-w-[70%] text-[10px] leading-4">
              <p><span className="text-text">{slot.symbol}</span> <span className="text-muted">· {meta?.name ?? slot.symbol} · {SPAN_LABEL[slot.timeframe]} · {meta?.exchange ?? "NSE"} · {quote?.mode ?? "…"}</span></p>
              {legendCandle ? <p className="font-mono text-[12px] leading-4"><span className="text-muted">O</span> {legendCandle.open.toFixed(2)} <span className="text-muted">H</span> {legendCandle.high.toFixed(2)} <span className="text-muted">L</span> {legendCandle.low.toFixed(2)} <span className="text-muted">C</span> {legendCandle.close.toFixed(2)} <span className="text-muted">Vol</span> {new Intl.NumberFormat("en-IN").format(legendCandle.volume)} <span className="text-muted">{formatIst(legendCandle.time)}</span></p> : quote ? <p className="font-mono text-[12px] leading-4"><span className="text-muted">O</span> {quote.open} <span className="text-muted">H</span> {quote.high} <span className="text-muted">L</span> {quote.low} <span className="text-muted">C</span> {quote.last} <span className={delta < 0 ? "text-loss" : delta > 0 ? "text-profit" : "text-muted"}>{delta > 0 ? "+" : ""}{delta.toFixed(2)} ({delta > 0 ? "+" : ""}{deltaPct.toFixed(2)}%)</span></p> : <p className="text-muted">{quoteError || "Waiting for a quote"}</p>}
              <div className="pointer-events-auto mt-1 flex gap-1">
                <button className="h-6 bg-primary px-2 text-[11px] font-semibold text-on-primary" onClick={() => { setTradeSide("BUY"); setShowRight(true); setMobile("trade"); }}>{demoOn ? `Buy ${playheadCandle ? playheadCandle.close.toFixed(2) : ""}` : `Buy ${quote?.ask ?? ""}`}</button>
                <button className="h-6 bg-loss px-2 text-[11px] font-semibold text-white" onClick={() => { setTradeSide("SELL"); setShowRight(true); setMobile("trade"); }}>{demoOn ? `Sell ${playheadCandle ? playheadCandle.close.toFixed(2) : ""}` : `Sell ${quote?.bid ?? ""}`}</button>
              </div>
              {tool === "text" || tool === "note" || tool === "price" || tool === "callout" || tool === "marker" ? <input value={annotation} onChange={(event) => setAnnotation(event.target.value)} placeholder={tool === "marker" ? "Emoji or symbol, then click" : tool === "price" ? "Optional label, then click the price" : "Text, then click the chart"} aria-label="Drawing label" className="pointer-events-auto mt-1 h-6 w-52 px-1 text-[11px]" /> : null}
              {tool === "trend" || tool === "fib" || tool === "measure" ? <p className="text-[11px] text-muted">Click the first point, then the second. Escape returns to the crosshair.</p> : null}
              {tool === "range" ? <p className="text-[11px] text-muted">Press and drag from the start price to the end price. The box shows the move, the percent, the bars, and the time. It does not place an order.</p> : null}
              {tool === "long" || tool === "short" ? <p className="text-[11px] text-muted">Click entry, then stop, then target. This only measures risk and reward. It does not place an order.</p> : null}
              {tool === "channel" || tool === "triangle" ? <p className="text-[11px] text-muted">Click three points. Escape cancels.</p> : null}
              {tool === "path" ? <p className="text-[11px] text-muted">Click each corner. Double-click or press Enter to finish.</p> : null}
              {tool === "forecast" ? <p className="text-[11px] text-muted">Click where the path starts, then where you expect price to go.</p> : null}
              {tool === "projection" ? <p className="text-[11px] text-muted">Click two points. The line continues one more step.</p> : null}
              {tool === "bars" ? <p className="text-[11px] text-muted">Click the first bar of the pattern, then the last. A copy is drawn after it.</p> : null}
              {tool === "ghost" ? <p className="text-[11px] text-muted">Click the first bar, then the last. A faded copy is drawn ahead of that range.</p> : null}
              {tool === "avwap" ? <p className="text-[11px] text-muted">Click the bar where VWAP should start.</p> : null}
              {tool === "vprofile" ? <p className="text-[11px] text-muted">Click the start of the range, then the end.</p> : null}
            </div>
            <div className={`grid min-h-0 flex-1 ${layout === 1 ? "grid-cols-1" : layout === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2 lg:grid-rows-2"}`}>
            {visible.map((item, index) => (
              <div key={`${item.symbol}-${index}`} className={`flex min-h-0 ${index === active && layout > 1 ? "ring-1 ring-primary" : ""} ${layout > 1 ? "min-h-40 border-border lg:border-r lg:border-b" : ""}`} onClick={() => setActive(index)}>
                <div className="flex min-w-0 flex-1 flex-col">
                  <ChartSlot
                    symbol={item.symbol}
                    timeframe={item.timeframe}
                    liveLast={index === active && !demoOn && quote?.marketOpen && quote.mode !== "HISTORICAL" && quote.mode !== "UNAVAILABLE" ? Number(quote.last) : null}
                    revealUntil={index === active ? visibleUntil : null}
                    onSeries={index === active ? setSeries : undefined}
                    onHover={index === active ? setHovered : undefined}
                    follow={false}
                    focusToken={index === active ? focusToken : 0}
                    compareSymbol={index === active ? compareSymbol : ""}
                    chartType={chartType}
                    showSma={showSma}
                    showEma={showEma}
                    showBands={showBands}
                    showVwap={showVwap}
                    showVolume={showVolume}
                    oscillator={index === active ? oscillator : "none"}
                    tool={index === active ? tool : "cursor"}
                    annotation={annotation}
                    drawings={drawings[item.symbol] ?? []}
                    onDrawings={(next, undo) => putDrawings(item.symbol, next, undo)}
                    handleRef={index === active ? handleRef : undefined}
                    magnet={magnet}
                    hidden={hideDrawings}
                    command={index === active ? command : null}
                    enabled={index === active}
                    onTool={setTool}
                    onSelect={index === active ? setSelectedDrawing : undefined}
                    scheme={chartScheme}
                  />
                </div>
              </div>
            ))}
            </div>
          </div>
        </section>
        <aside className={`${!showRight ? "hidden" : mobile === "trade" ? "flex w-full" : "hidden lg:flex"} w-full shrink-0 flex-col overflow-auto border-l border-border bg-panel lg:w-[22rem]`}>
          {demoOn ? <DemoTicket symbol={slot.symbol} company={meta?.name ?? ""} candle={playheadCandle} revealTime={replayLimit} book={demoBook} preferSide={tradeSide} onBook={setDemoBook} /> : <OrderTicket symbol={slot.symbol} company={meta?.name ?? ""} quote={quote} portfolio={portfolio} preferSide={tradeSide} onFilled={async () => { loadBook(); api<ClosedRow[]>("/api/trades").then(setClosed).catch(() => setClosed([])); }} />}
          <SizeTool />
        </aside>
      </div>
      {showBook ? <section className={`${mobile === "book" ? "flex" : "hidden"} min-h-0 flex-col border-t border-border bg-panel lg:flex`} style={{ height: dockHeight }}>
        <div
          className="h-1.5 cursor-row-resize bg-border"
          onPointerDown={(event) => {
            const startY = event.clientY;
            const start = dockHeight;
            const move = (next: PointerEvent) => setDockHeight(Math.min(420, Math.max(120, start + startY - next.clientY)));
            const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        />
        <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1">
          {(["overview", "positions", "orders", "trades", "history", "account", "performance", "notes"] as const).map((item) => (
            <button key={item} className={chip(dock === item)} onClick={() => setDock(item)}>{item}</button>
          ))}
          <Link href="/journal" className="ml-auto self-center text-xs text-primary">Open journal</Link>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {portfolioError ? <p className="p-2 text-xs text-loss">{portfolioError}</p> : null}
          {dock === "overview" && portfolio ? <Overview portfolio={portfolio} /> : null}
          {dock === "positions" ? <Positions portfolio={portfolio} onSelect={selectSymbol} /> : null}
          {dock === "orders" ? <Orders activity={activity} onCancel={(id) => api(`/api/orders/${id}/cancel`, {}).then(loadBook)} /> : null}
          {dock === "trades" ? <Trades activity={activity} /> : null}
          {dock === "history" ? <HistoryRows rows={closed} /> : null}
          {dock === "account" ? <Ledger activity={activity} /> : null}
          {dock === "performance" ? <Performance analytics={analytics} portfolio={portfolio} /> : null}
          {dock === "notes" ? <Notes rows={notes} /> : null}
        </div>
      </section> : null}
      <footer className="flex h-6 shrink-0 items-center gap-1 border-t border-border bg-panel px-1.5">
        {CHART_SPANS.map((item) => (
          <button key={item} className={`h-5 shrink-0 px-1 text-[10px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary ${slot.timeframe === item ? "bg-primary text-on-primary" : "text-muted hover:text-text"}`} onClick={() => setSlots((current) => current.map((slotItem, index) => (index === active ? { ...slotItem, timeframe: item } : slotItem)))}>{SPAN_LABEL[item]}</button>
        ))}
        <span className="truncate pl-2 text-[10px] text-muted">{quote?.message ?? ""}</span>
      </footer>
    </div>
  );
}

function ChartSlot(props: {
  symbol: string;
  timeframe: ChartSpan;
  liveLast: number | null;
  revealUntil?: number | null;
  onSeries?: (candles: Candle[]) => void;
  onHover?: (candle: Candle | null) => void;
  follow?: boolean;
  focusToken?: number;
  compareSymbol: string;
  chartType: ChartType;
  showSma: boolean;
  showEma: boolean;
  showBands: boolean;
  showVwap: boolean;
  showVolume: boolean;
  oscillator: "none" | "rsi" | "macd";
  tool: DrawTool;
  annotation: string;
  drawings: Drawing[];
  onDrawings: (next: Drawing[], undo?: boolean) => void;
  handleRef?: { current: ChartHandle | null };
  magnet: boolean;
  hidden: boolean;
  command: { id: number; name: "lock" | "trash" | "color" } | null;
  enabled: boolean;
  onTool: (tool: DrawTool) => void;
  onSelect?: (id: string | null) => void;
  scheme: "dark" | "light";
}) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [compare, setCompare] = useState<Candle[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let ignore = false;
    setCandles([]);
    async function load() {
      try {
        const result = await api<{ candles: Candle[]; mode: string; message: string }>(`/api/market/candles?symbol=${props.symbol}&timeframe=${props.timeframe}`);
        if (!ignore) { setCandles(result.candles); setMessage(`${result.mode}. ${result.message}`); }
      } catch (error) {
        if (!ignore) setMessage(error instanceof Error ? error.message : "Candles unavailable.");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { ignore = true; window.clearInterval(timer); };
  }, [props.symbol, props.timeframe]);
  useEffect(() => { props.onSeries?.(candles); }, [candles, props.onSeries]);
  useEffect(() => {
    if (props.liveLast == null) return;
    setCandles((current) => applyLiveTick(current, props.timeframe, props.liveLast ?? 0, Math.floor(Date.now() / 1000), true));
  }, [props.liveLast, props.timeframe]);
  useEffect(() => {
    if (!props.compareSymbol) { setCompare([]); return; }
    let ignore = false;
    api<{ candles: Candle[] }>(`/api/market/candles?symbol=${props.compareSymbol}&timeframe=${props.timeframe}`)
      .then((result) => { if (!ignore) setCompare(result.candles); })
      .catch(() => { if (!ignore) setCompare([]); });
    return () => { ignore = true; };
  }, [props.compareSymbol, props.timeframe]);
  const shown = useMemo(() => sliceTo(candles, props.revealUntil ?? null), [candles, props.revealUntil]);
  const shownCompare = useMemo(() => sliceTo(compare, props.revealUntil ?? null), [compare, props.revealUntil]);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="sr-only">{message}</p>
      <ChartPanel
        streamKey={`${props.symbol}:${props.timeframe}`}
        candles={shown}
        compare={shownCompare}
        onHover={props.onHover}
        follow={props.follow}
        focusToken={props.focusToken}
        chartType={props.chartType}
        showSma={props.showSma}
        showEma={props.showEma}
        showBands={props.showBands}
        showVwap={props.showVwap}
        showVolume={props.showVolume}
        oscillator={props.oscillator}
        tool={props.tool}
        annotation={props.annotation}
        drawings={props.drawings}
        onDrawings={props.onDrawings}
        handleRef={props.handleRef}
        magnet={props.magnet}
        hidden={props.hidden}
        command={props.command}
        enabled={props.enabled}
        onTool={props.onTool}
        onSelect={props.onSelect}
        scheme={props.scheme}
      />
    </div>
  );
}

function DemoTicket({ symbol, company, candle, revealTime, book, preferSide, onBook }: { symbol: string; company: string; candle: Candle | null; revealTime: number | null; book: DemoBook; preferSide: "BUY" | "SELL"; onBook: (book: DemoBook) => void }) {
  const [side, setSide] = useState<"BUY" | "SELL">(preferSide);
  useEffect(() => setSide(preferSide), [preferSide]);
  const [quantity, setQuantity] = useState("1");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const position = book.positions.find((item) => item.symbol === symbol) ?? null;
  const markPaise = candle && Number.isFinite(candle.close) ? Number(rupeesToPaise(candle.close.toFixed(2))) : null;
  const unrealized = position && markPaise != null ? (markPaise - position.avgPaise) * position.quantity : 0;
  const holdings = book.positions.reduce((total, item) => total + (item.symbol === symbol && markPaise != null ? markPaise : item.avgPaise) * item.quantity, 0);
  const fills = book.fills.filter((item) => item.symbol === symbol).slice(-6).reverse();

  function submit() {
    setError("");
    setResult("");
    if (!candle || revealTime == null) { setError("Wait for a replay candle before placing a demo order."); return; }
    const filled = applyDemoFill(book, { id: crypto.randomUUID(), symbol, side, quantity: Number(quantity), candle, playheadTime: candle.time, revealTime });
    if (!filled.ok) { setError(filled.error); return; }
    onBook(filled.book);
    setResult(`${side} filled at ₹${candle.close.toFixed(2)} on ${formatIst(candle.time)}.`);
  }

  return (
    <div className="bg-panel text-xs">
      <div className="border-b border-border px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-primary">Demo replay · separate from the portfolio</p>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-text">Demo {symbol}</h2>
          <p className="font-mono text-sm text-text">{candle ? `₹${candle.close.toFixed(2)}` : "—"}</p>
        </div>
        <p className="text-muted">{company || "Practice catalogue"} · {candle ? formatIst(candle.time) : "No replay candle"}</p>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-border">
        {[
          ["Demo cash", formatInr(BigInt(Math.round(book.cashPaise)))],
          ["Demo equity", formatInr(BigInt(Math.round(book.cashPaise + holdings)))],
          ["Realized", formatInr(BigInt(Math.round(book.realizedPaise)))],
          ["Unrealized", formatInr(BigInt(Math.round(demoUnrealized(book, markPaise == null ? {} : { [symbol]: markPaise }))))],
          ["Shares", String(position?.quantity ?? 0)],
          ["Average", position ? `₹${formatDemoRupees(position.avgPaise)}` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-1.5">
            <dt className="text-[10px] uppercase text-muted">{label}</dt>
            <dd className="font-mono text-text">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-1">
          {(["BUY", "SELL"] as const).map((item) => (
            <button key={item} onClick={() => setSide(item)} className={`py-2 font-semibold ${side === item ? (item === "BUY" ? "bg-primary text-on-primary" : "bg-loss text-white") : "border border-border bg-background text-text"}`}>{item}</button>
          ))}
        </div>
        <label className="mt-3 block text-muted">Quantity
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 h-8 w-full px-2 text-xs" />
        </label>
        <p className="mt-2 text-muted">Fill uses this candle’s close, ₹{candle ? candle.close.toFixed(2) : "—"}. Open unrealized is ₹{formatDemoRupees(unrealized)} and moves when playback reaches another close.</p>
        {error ? <p className="mt-2 text-loss">{error}</p> : null}
        {result ? <p className="mt-2 text-profit">{result}</p> : null}
        <button onClick={submit} className="mt-3 w-full bg-primary py-2 font-semibold text-on-primary">Fill demo order</button>
        <p className="mt-2 text-[11px] text-muted">This stays in the demo book on this browser. Trade still uses the portfolio, and nothing is sent to a broker.</p>
        {fills.length ? (
          <ul className="mt-3 space-y-1 text-muted">
            {fills.map((fill) => <li key={fill.id} className="flex justify-between gap-2 font-mono"><span>{fill.side} {fill.quantity}</span><span>₹{formatDemoRupees(fill.pricePaise)}</span></li>)}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function OrderTicket({ symbol, company, quote, portfolio, onFilled, preferSide }: { symbol: string; company: string; quote: Quote | null; portfolio: Portfolio | null; onFilled: () => Promise<void>; preferSide: "BUY" | "SELL" }) {
  const [side, setSide] = useState<"BUY" | "SELL">(preferSide);
  useEffect(() => setSide(preferSide), [preferSide]);
  const [type, setType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" | "TARGET">("MARKET");
  const [quantity, setQuantity] = useState("1");
  const [limit, setLimit] = useState("");
  const [stop, setStop] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const reference = side === "BUY" ? quote?.ask : quote?.bid;
  const price = type === "MARKET" || type === "STOP" ? reference : limit;
  const estimate = estimateOrder(side, quantity, price);
  const owned = portfolio?.positions.find((item) => item.symbol === symbol)?.quantity ?? 0;
  const cash = portfolio ? parseInr(portfolio.cashAvailable) : null;
  const tooManyShares = side === "SELL" && Number(quantity) > owned;
  const tooLittleCash = side === "BUY" && estimate && cash != null && estimate.total > cash;

  async function submit() {
    setPending(true);
    setError("");
    setResult("");
    try {
      const response = await api<{ status: string; message?: string | null }>("/api/orders", {
        symbol, side, type, quantity: Number(quantity), limitRupees: limit || undefined, stopRupees: stop || undefined, idempotencyKey: crypto.randomUUID(),
      });
      setResult(`${response.status}${response.message ? ` · ${response.message}` : ""}`);
      setConfirming(false);
      await onFilled();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Order failed.");
    } finally {
      setPending(false);
    }
  }

  const remaining = estimate && cash != null
    ? side === "BUY" ? cash - estimate.total : cash + estimate.notional - estimate.charges
    : null;
  const session = quote ? (quote.marketOpen ? "Session open" : "Session closed") : "Status unknown";

  return (
    <div className="bg-panel text-xs">
      <div className="border-b border-border px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Paper trade · virtual money</p>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-text">Trade {symbol}</h2>
          <p className="font-mono text-sm text-text">{quote ? `₹${quote.last}` : "—"}</p>
        </div>
        <p className="text-muted">{company || "Practice catalogue"} · {quote?.mode ?? "No quote"} · {session}</p>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-border">
        {[
          ["Initial capital", portfolio?.startingCapital ?? "—"],
          ["Buying power", portfolio?.cashAvailable ?? "—"],
          ["Invested", portfolio?.holdingsValue ?? "—"],
          ["Reserved", portfolio?.cashReserved ?? "—"],
          ["Realized", portfolio?.realized ?? "—"],
          ["Unrealized", portfolio?.unrealized ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-1.5">
            <dt className="text-[10px] uppercase text-muted">{label}</dt>
            <dd className={`font-mono text-text ${tone(value)}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-1">
          {(["BUY", "SELL"] as const).map((item) => (
            <button key={item} onClick={() => setSide(item)} className={`py-2 font-semibold ${side === item ? (item === "BUY" ? "bg-primary text-on-primary" : "bg-loss text-white") : "border border-border bg-background text-text"}`}>{item}</button>
          ))}
        </div>
        <label className="mt-3 block text-muted">Order type
          <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="mt-1 h-8 w-full px-2 text-xs text-text">
            {["MARKET", "LIMIT", "STOP", "STOP_LIMIT", "TARGET"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="mt-2 block text-muted">Quantity
          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 h-8 w-full px-2 text-xs" />
        </label>
        {type !== "MARKET" && type !== "STOP" ? <label className="mt-2 block text-muted">{type === "TARGET" ? "Target price" : "Limit price"}<input value={limit} onChange={(event) => setLimit(event.target.value)} className="mt-1 h-8 w-full px-2 text-xs" /></label> : null}
        {type === "STOP" || type === "STOP_LIMIT" ? <label className="mt-2 block text-muted">Stop price<input value={stop} onChange={(event) => setStop(event.target.value)} className="mt-1 h-8 w-full px-2 text-xs" /></label> : null}
        <dl className="mt-3 space-y-1 text-muted">
          <div className="flex justify-between"><dt>Reference</dt><dd className="font-mono text-text">{price ? `₹${price}` : "No quote"}</dd></div>
          <div className="flex justify-between"><dt>Estimated value</dt><dd className="font-mono text-text">{estimate ? `₹${paiseToRupees(estimate.notional)}` : "—"}</dd></div>
          <div className="flex justify-between"><dt>Estimated charges</dt><dd className="font-mono text-text">{estimate ? `₹${paiseToRupees(estimate.charges)}` : "—"}</dd></div>
          <div className="flex justify-between"><dt>Cash after estimate</dt><dd className="font-mono text-text">{remaining == null ? "—" : `₹${paiseToRupees(remaining)}`}</dd></div>
          <div className="flex justify-between"><dt>Shares held</dt><dd className="font-mono text-text">{owned}</dd></div>
        </dl>
        {tooManyShares ? <p className="mt-2 text-loss">Sell quantity is above the shares you hold. Short selling is not enabled.</p> : null}
        {tooLittleCash ? <p className="mt-2 text-loss">Estimated cost is above available buying power. The server rejects an order it cannot fund.</p> : null}
        {error ? <p className="mt-2 text-loss">{error}</p> : null}
        {result ? <p className="mt-2 text-profit">{result}</p> : null}
        {confirming ? (
          <div className="mt-3 border border-border bg-background p-2">
            <p className="text-text">Submit a simulated {side} {type} for {quantity} {symbol}? No broker receives this order.</p>
            <div className="mt-2 flex gap-1">
              <button disabled={pending || tooManyShares} onClick={submit} className="bg-primary px-3 py-1.5 text-on-primary disabled:opacity-50">{pending ? "Submitting…" : "Confirm"}</button>
              <button disabled={pending} onClick={() => setConfirming(false)} className="border border-border px-3 py-1.5">Back</button>
            </div>
          </div>
        ) : <button disabled={pending || tooManyShares} onClick={() => setConfirming(true)} className="mt-3 w-full bg-primary py-2 font-semibold text-on-primary disabled:opacity-50">Review order</button>}
        <p className="mt-2 text-[11px] text-muted">A completed history row is written when this position is sold back to zero shares. <Link className="text-primary" href="/history">Trade history</Link></p>
      </div>
    </div>
  );
}

function SizeTool() {
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [risk, setRisk] = useState("");
  const [target, setTarget] = useState("");
  const entryN = Number(entry);
  const stopN = Number(stop);
  const riskN = Number(risk);
  const targetN = Number(target);
  const distance = Number.isFinite(entryN) && Number.isFinite(stopN) ? Math.abs(entryN - stopN) : 0;
  const shares = distance > 0 && riskN > 0 ? Math.floor(riskN / distance) : 0;
  const reward = Number.isFinite(targetN) && distance > 0 ? Math.abs(targetN - entryN) / distance : 0;
  return (
    <div className="border-t border-border p-2 text-xs text-muted">
      <p className="text-text">Position size</p>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <input value={entry} onChange={(event) => setEntry(event.target.value)} placeholder="Entry" aria-label="Entry" className="h-7 px-2" />
        <input value={stop} onChange={(event) => setStop(event.target.value)} placeholder="Stop" aria-label="Stop" className="h-7 px-2" />
        <input value={risk} onChange={(event) => setRisk(event.target.value)} placeholder="Risk ₹" aria-label="Risk rupees" className="h-7 px-2" />
        <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Target" aria-label="Target" className="h-7 px-2" />
      </div>
      <p className="mt-1">Shares at that risk: {shares || "—"}. Reward / risk: {reward ? reward.toFixed(2) : "—"}. This calculator does not place an order.</p>
    </div>
  );
}

function Overview({ portfolio }: { portfolio: Portfolio }) {
  const rows = [["Initial", portfolio.startingCapital], ["Equity", portfolio.equity], ["Cash", portfolio.cashAvailable], ["Reserved", portfolio.cashReserved], ["Invested", portfolio.holdingsValue], ["Today", portfolio.dailyReturn ?? "—"], ["Realized", portfolio.realized], ["Unrealized", portfolio.unrealized]];
  return (
    <div className="p-2">
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {rows.map(([label, value]) => <div key={label} className="bg-panel px-2 py-1"><p className="text-[10px] uppercase text-muted">{label}</p><p className={`font-mono text-sm ${tone(value)}`}>{value}</p></div>)}
      </div>
      <p className="px-2 py-1 text-[11px] text-muted">{portfolio.stale ? "Stale valuation. " : ""}{portfolio.valuationMessage}</p>
    </div>
  );
}

function Positions({ portfolio, onSelect }: { portfolio: Portfolio | null; onSelect: (symbol: string) => void }) {
  return (
    <table className="text-xs">
      <thead><tr><th>Symbol</th><th>Qty</th><th>Avg</th><th>Mark</th><th>Value</th><th>Unrealized</th><th>Return</th></tr></thead>
      <tbody>
        {!portfolio || portfolio.positions.length === 0 ? <tr><td colSpan={7} className="text-muted">No open holdings.</td></tr> : null}
        {portfolio?.positions.map((position) => (
          <tr key={position.symbol}>
            <td><button className="font-semibold" onClick={() => onSelect(position.symbol)}>{position.symbol}</button></td>
            <td className="font-mono">{position.quantity}</td>
            <td className="font-mono">{position.averageCost}</td>
            <td className="font-mono">{position.mark ?? "—"}</td>
            <td className="font-mono">{position.marketValue ?? "—"}</td>
            <td className={`font-mono ${tone(position.unrealized)}`}>{position.unrealized ?? "—"}</td>
            <td className="font-mono">{returnPercent(position.averageCost, position.mark)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Orders({ activity, onCancel }: { activity: Activity | null; onCancel: (id: string) => Promise<unknown> }) {
  const rows = activity?.orders ?? [];
  return (
    <table className="text-xs">
      <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Limit</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={8} className="text-muted">No orders in this practice period.</td></tr> : null}
        {rows.map((order) => (
          <tr key={order.id}>
            <td className="whitespace-nowrap text-muted">{new Date(order.submittedAt).toLocaleString("en-IN")}</td>
            <td>{order.symbol}</td>
            <td className={order.side === "BUY" ? "text-profit" : "text-loss"}>{order.side}</td>
            <td>{order.type}</td>
            <td className="font-mono">{order.filledQuantity}/{order.quantity}</td>
            <td className="font-mono">{order.limit ?? "—"}</td>
            <td>{order.status}{order.reason ? ` · ${order.reason}` : ""}</td>
            <td>{order.status === "OPEN" ? <button className="text-primary" onClick={() => onCancel(order.id)}>Cancel</button> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Trades({ activity }: { activity: Activity | null }) {
  const rows = activity?.executions ?? [];
  return (
    <table className="text-xs">
      <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Charges</th><th>Realized</th><th>Data</th></tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={8} className="text-muted">No fills yet.</td></tr> : null}
        {rows.map((fill) => (
          <tr key={fill.id}>
            <td className="text-muted">{new Date(fill.executedAt).toLocaleString("en-IN")}</td>
            <td>{fill.symbol}</td><td>{fill.side}</td><td className="font-mono">{fill.quantity}</td>
            <td className="font-mono">{fill.price}</td><td className="font-mono">{fill.charges}</td>
            <td className={`font-mono ${tone(fill.realized)}`}>{fill.realized}</td><td>{fill.mode}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryRows({ rows }: { rows: ClosedRow[] }) {
  return (
    <table className="text-xs">
      <thead><tr><th>Closed</th><th>Symbol</th><th>Qty</th><th>Entry</th><th>Exit</th><th>Net</th><th></th></tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={7} className="text-muted">No fully closed positions yet. Open buys stay in the portfolio until they are sold.</td></tr> : null}
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="whitespace-nowrap text-muted">{new Date(row.exitAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
            <td>{row.symbol}</td>
            <td className="font-mono">{row.quantity}</td>
            <td className="font-mono">{row.averageEntry}</td>
            <td className="font-mono">{row.averageExit}</td>
            <td className={`font-mono ${tone(row.net)}`}>{row.net}</td>
            <td><Link className="text-primary" href={`/history/${row.id}`}>Receipt</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Ledger({ activity }: { activity: Activity | null }) {
  const rows = activity?.ledger ?? [];
  return (
    <table className="text-xs">
      <thead><tr><th>Time</th><th>Type</th><th>Cash change</th><th>Reason</th></tr></thead>
      <tbody>
        {rows.length === 0 ? <tr><td colSpan={4} className="text-muted">No ledger rows yet.</td></tr> : null}
        {rows.map((entry) => (
          <tr key={entry.id}><td className="text-muted">{new Date(entry.createdAt).toLocaleString("en-IN")}</td><td>{entry.type}</td><td className="font-mono">{entry.cashDelta}</td><td>{entry.reason}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function Performance({ analytics, portfolio }: { analytics: Analytics | null; portfolio: Portfolio | null }) {
  if (!analytics) return <p className="p-2 text-xs text-muted">Loading performance…</p>;
  const rows = [["Win rate", analytics.winRate], ["Average win", analytics.averageWin], ["Average loss", analytics.averageLoss], ["Profit factor", analytics.profitFactor], ["Max drawdown", analytics.maxDrawdown], ["All-time", portfolio?.allTimeReturn ?? "—"]];
  return (
    <div className="p-2 text-xs">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([label, value]) => <div key={label}><p className="text-muted">{label}</p><p className="font-mono text-text">{value}</p></div>)}
      </div>
      <p className="mt-2 text-muted">{analytics.wins} winning and {analytics.losses} losing closed trades. {analytics.disclaimer}</p>
      <Link href="/analytics" className="mt-1 inline-block text-primary">Open the equity curve</Link>
    </div>
  );
}

function Notes({ rows }: { rows: Journal[] }) {
  if (!rows.length) return <p className="p-2 text-xs text-muted">No journal entries yet.</p>;
  return (
    <div className="space-y-2 p-2 text-xs">
      {rows.map((row) => <article key={row.id} className="border border-border px-2 py-1"><p className="text-muted">{new Date(row.createdAt).toLocaleString("en-IN")} {row.symbol ? `· ${row.symbol}` : ""}</p><p>{row.thesis}</p>{row.lesson ? <p className="text-muted">{row.lesson}</p> : null}</article>)}
    </div>
  );
}

function Change({ last, previous }: { last?: string; previous?: string }) {
  if (!last || !previous) return null;
  const delta = Number(last) - Number(previous);
  if (!Number.isFinite(delta) || Number(previous) === 0) return null;
  const percent = (delta / Number(previous)) * 100;
  const up = delta > 0;
  const down = delta < 0;
  return <span className={`block text-right font-mono ${up ? "text-profit" : down ? "text-loss" : "text-muted"}`}>{up ? "+" : ""}{delta.toFixed(2)} ({up ? "+" : ""}{percent.toFixed(2)}%)</span>;
}

function Toggle({ on, label, set }: { on: boolean; label: string; set: (value: boolean) => void }) {
  return <button className={chip(on)} onClick={() => set(!on)}>{label}</button>;
}

function chip(active: boolean) {
  return `h-6 px-2 text-xs ${active ? "bg-primary text-on-primary" : "bg-background text-text"}`;
}

function barButton(active: boolean, disabled = false) {
  return `grid h-8 min-w-8 shrink-0 place-items-center px-1.5 text-[11px] leading-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary ${disabled ? "cursor-not-allowed opacity-40" : active ? "bg-border text-text" : "text-text hover:bg-border"}`;
}

function BarGlyph({ name }: { name: "candles" | "bars" | "line" | "area" | "indicators" | "layout" | "alert" | "undo" | "redo" | "image" | "full" | "watchlist" | "positions" }) {
  const props = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "candles") return <svg {...props}><path d="M8 2.5v3.5M8 15v6.5M5 6h6v9H5zM16 4v2.5M16 16.5V21M13 6.5h6v10h-6z" /></svg>;
  if (name === "bars") return <svg {...props}><path d="M6 20V9M4 9h4M6 14h3M12 20V4M10 4h4M12 11h3M18 20v-9M16 11h4M18 15h3" /></svg>;
  if (name === "line") return <svg {...props}><path d="M3 17l5.5-7 4.5 3.5L21 5" /></svg>;
  if (name === "area") return <svg {...props}><path d="M3 17l5.5-7 4.5 3.5L21 5v13H3z" /></svg>;
  if (name === "indicators") return <svg {...props}><path d="M3 17l5-8 4 3 5-7 4 4" /><circle cx="8" cy="9" r="1.15" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" /><circle cx="17" cy="5" r="1.15" fill="currentColor" stroke="none" /></svg>;
  if (name === "layout") return <svg {...props}><rect x="3" y="3" width="7.5" height="7.5" /><rect x="13.5" y="3" width="7.5" height="7.5" /><rect x="3" y="13.5" width="7.5" height="7.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" /></svg>;
  if (name === "alert") return <svg {...props}><path d="M6 9.5a6 6 0 0 1 12 0c0 6 1.8 7.2 1.8 8.5H4.2C4.2 16.7 6 15.5 6 9.5z" /><path d="M10 20.2a2 2 0 0 0 4 0" /></svg>;
  if (name === "undo") return <svg {...props}><path d="M8.5 14.5L4 10l4.5-4.5" /><path d="M4 10h10a5 5 0 1 1 0 10H12" /></svg>;
  if (name === "redo") return <svg {...props}><path d="M15.5 14.5L20 10l-4.5-4.5" /><path d="M20 10H10a5 5 0 1 0 0 10h2" /></svg>;
  if (name === "image") return <svg {...props}><rect x="3" y="4.5" width="18" height="15" /><circle cx="8.2" cy="9.2" r="1.35" /><path d="M3 16.2l4.8-4 3.7 2.8 3.2-2.2 6.3 5" /></svg>;
  if (name === "full") return <svg {...props}><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>;
  if (name === "watchlist") return <svg {...props}><path d="M12 3.2l1.8 3.7 4 .6-2.9 2.8.7 4.1L12 12.5 8.4 14.4l.7-4.1L6.2 7.5l4-.6z" /></svg>;
  return <svg {...props}><path d="M4 19V11M10 19V6M16 19v-6M20 19H3" /></svg>;
}

function SchemeIcon({ mode }: { mode: "dark" | "light" }) {
  const props = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (mode === "dark") return <svg {...props}><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" /></svg>;
  return <svg {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}

function ForecastIcon({ name = "forecast" }: { name?: DrawTool }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "long") return <svg {...props}><path d="M3 17h5M8 17V9M12 17V7M16 17V11" /><path d="M15 7h5M18 4v6" /></svg>;
  if (name === "short") return <svg {...props}><path d="M3 7h5M8 7v8M12 7v10M16 7v6" /><path d="M15 17h5M18 14v6" /></svg>;
  if (name === "bars") return <svg {...props}><path d="M7 16V8M12 18V6M17 14V10" /><path d="M5 16h4M10 18h4M15 14h4" /></svg>;
  if (name === "ghost") return <svg {...props}><path d="M6 16V9M10 17V7M14 15V10" opacity="0.45" /><path d="M8 18c2 2 6 2 8 0" /></svg>;
  if (name === "projection") return <svg {...props}><path d="M4 18c4-1 6-6 8-8s5-4 8-3" /></svg>;
  if (name === "avwap") return <svg {...props}><path d="M4 16c3-1 4-6 7-7s5 1 9-3" /><path d="M5 19v-3M5 16h3" /></svg>;
  if (name === "vprofile") return <svg {...props}><path d="M6 5v14" /><path d="M6 8h8M6 12h12M6 16h6" /></svg>;
  return <svg {...props}><path d="M5 16V9M9 18V6M13 15V8M17 17V11" /></svg>;
}

function ToolIcon({ name }: { name: DrawTool | "magnet" | "lock" | "hide" | "trash" | "color" }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const dot = (cx: number, cy: number) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" fill="currentColor" stroke="none" />;
  if (name === "cursor") return <svg {...props}><path d="M12 2.5v19M2.5 12h19" /><circle cx="12" cy="12" r="3.2" /></svg>;
  if (name === "trend" || name === "ray" || name === "extended") return <svg {...props}><path d="M4 19 L20 5" />{name === "trend" ? dot(4, 19) : null}{dot(20, 5)}</svg>;
  if (name === "hray") return <svg {...props}><path d="M4 12h16" />{dot(4, 12)}</svg>;
  if (name === "vline") return <svg {...props}><path d="M12 3v18" />{dot(12, 4)}</svg>;
  if (name === "angle") return <svg {...props}><path d="M4 18h14" /><path d="M4 18 L16 6" /></svg>;
  if (name === "fibext" || name === "fibtime") return <svg {...props}><path d="M4 6h16M4 12h12M4 18h8" /></svg>;
  if (name === "rect") return <svg {...props}><rect x="4" y="6" width="16" height="12" /></svg>;
  if (name === "ellipse") return <svg {...props}><ellipse cx="12" cy="12" rx="8" ry="5" /></svg>;
  if (name === "triangle") return <svg {...props}><path d="M12 5 L20 19 H4 Z" /></svg>;
  if (name === "arrow") return <svg {...props}><path d="M5 19 L19 5" /><path d="M11 5h8v8" /></svg>;
  if (name === "note" || name === "price" || name === "callout") return <svg {...props}><path d="M6 4h9l3 3v13H6z" /><path d="M15 4v4h4" /></svg>;
  if (name === "range") return <svg {...props}><path d="M4 18 L18 6" /><path d="M4 18h5M4 18v-5M18 6h-5M18 6v5" /><path d="M8.2 14.6l1.5 1.5M11.4 11.4l1.5 1.5" /></svg>;
  if (name === "long" || name === "short" || name === "forecast" || name === "bars" || name === "ghost" || name === "projection" || name === "avwap" || name === "vprofile") return <ForecastIcon name={name} />;
  if (name === "hline") return <svg {...props}><path d="M3 12h18" />{dot(7.5, 12)}{dot(16.5, 12)}</svg>;
  if (name === "channel") return <svg {...props}><path d="M4 16.5 L15.5 5" /><path d="M8.5 19 L20 7.5" /></svg>;
  if (name === "path") return <svg {...props}><path d="M4 19 L9 8 L14 13 L20 5" />{dot(4, 19)}{dot(9, 8)}{dot(14, 13)}{dot(20, 5)}</svg>;
  if (name === "fib") return <svg {...props}><path d="M4 5h16M4 9.5h12M4 14h8M4 19h16" /></svg>;
  if (name === "brush") return <svg {...props}><path d="M14 4.5l5.5 5.5L8.5 21H3v-5.5z" /><path d="M12.5 6l5.5 5.5" /></svg>;
  if (name === "text") return <svg {...props}><path d="M5 5h14M12 5v14" /></svg>;
  if (name === "marker") return <svg {...props}><path d="M12 21s6.5-5.4 6.5-10.2a6.5 6.5 0 1 0-13 0C5.5 15.6 12 21 12 21z" /><circle cx="12" cy="10.8" r="2" /></svg>;
  if (name === "measure") return <svg {...props}><path d="M4 19 L19 4" /><path d="M4 19v-4.5M4 19h4.5M19 4v4.5M19 4h-4.5" /><path d="M8.2 14.8l2 2M11.2 11.8l2 2" /></svg>;
  if (name === "zoom") return <svg {...props}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15.2 L20.5 20.5" /></svg>;
  if (name === "magnet") return <svg {...props}><path d="M7 13V8.5a5 5 0 0 1 10 0V13" /><path d="M7 13v4M7 17h3.2V13M13.8 13v4H17v-4" /></svg>;
  if (name === "lock") return <svg {...props}><rect x="6" y="11" width="12" height="9" rx="1.5" /><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11" /></svg>;
  if (name === "hide") return <svg {...props}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.6" /></svg>;
  if (name === "color") return <svg {...props}><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>;
  return <svg {...props}><path d="M5 7h14" /><path d="M9 7V4.5h6V7" /><path d="M7.5 7l.8 13h7.4l.8-13" /></svg>;
}

function parseInr(value: string): bigint | null {
  try { return rupeesToPaise(value.replace(/₹/g, "").replace(/,/g, "")); }
  catch { return null; }
}

function estimateOrder(side: "BUY" | "SELL", quantity: string, price?: string) {
  const qty = Number(quantity);
  if (!price || !Number.isInteger(qty) || qty <= 0) return null;
  try {
    const notional = rupeesToPaise(price) * BigInt(qty);
    const charges = calculateCharges(side, notional, DEFAULT_CHARGES).total;
    return { notional, charges, total: notional + charges };
  } catch {
    return null;
  }
}

function returnPercent(average: string, mark: string | null) {
  if (!mark) return "—";
  const cost = Number(average);
  const last = Number(mark);
  if (!Number.isFinite(cost) || !Number.isFinite(last) || cost === 0) return "—";
  const percent = ((last - cost) / cost) * 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}
