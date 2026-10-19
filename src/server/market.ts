import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/http";
import { applyAdverseSlippage, rupeesToPaise } from "@/lib/money";
import { DEMO_UNIVERSE, demoIntraday, demoDailyCandles, demoQuote, type Candle, type DemoQuote } from "@/lib/market/demo";
import { nseCashSession } from "@/lib/market/clock";
import { dhanCandles, dhanQuote } from "@/server/dhan-market";
import { aggregatePeriod, type ChartSpan } from "@/lib/market/spans";
import { configuredProvider, getHolidays } from "@/server/settings";
import { DEFAULT_CHARGES } from "@/lib/trading/settings";
import type { DataMode } from "@prisma/client";

export type PublicQuote = DemoQuote & { symbolName?: string };

async function remember(quote: DemoQuote, instrumentId?: string) {
  if (!instrumentId) return;
  await prisma.quoteCache.upsert({
    where: { instrumentId },
    create: {
      instrumentId,
      lastPaise: quote.lastPaise,
      bidPaise: quote.bidPaise,
      askPaise: quote.askPaise,
      openPaise: quote.openPaise,
      highPaise: quote.highPaise,
      lowPaise: quote.lowPaise,
      previousClosePaise: quote.previousClosePaise,
      volume: quote.volume,
      asOf: quote.asOf,
      mode: quote.mode as DataMode,
      source: quote.source,
      marketOpen: quote.marketOpen,
      message: quote.message,
    },
    update: {
      lastPaise: quote.lastPaise,
      bidPaise: quote.bidPaise,
      askPaise: quote.askPaise,
      openPaise: quote.openPaise,
      highPaise: quote.highPaise,
      lowPaise: quote.lowPaise,
      previousClosePaise: quote.previousClosePaise,
      volume: quote.volume,
      asOf: quote.asOf,
      mode: quote.mode as DataMode,
      source: quote.source,
      marketOpen: quote.marketOpen,
      message: quote.message,
    },
  });
}

async function markStatus(mode: DataMode, message: string, error?: string) {
  await prisma.marketDataStatus.upsert({
    where: { id: "primary" },
    create: {
      id: "primary",
      provider: configuredProvider(),
      mode,
      lastSuccessAt: error ? null : new Date(),
      lastErrorAt: error ? new Date() : null,
      lastError: error ?? "",
      message,
    },
    update: {
      provider: configuredProvider(),
      mode,
      lastSuccessAt: error ? undefined : new Date(),
      lastErrorAt: error ? new Date() : undefined,
      lastError: error ?? "",
      message,
    },
  });
}

function toPaise(value: unknown): bigint | null {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return rupeesToPaise(number.toFixed(2));
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) throw new AppError(`Market data provider returned ${response.status}.`, 502);
  return response.json();
}

async function twelveQuote(symbol: string, exchange: string, now: Date, holidays: string[]): Promise<DemoQuote> {
  const key = process.env.MARKET_DATA_API_KEY;
  if (!key) throw new AppError("MARKET_DATA_API_KEY is not configured.", 503);
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&apikey=${encodeURIComponent(key)}`;
  const payload = (await fetchJson(url)) as Record<string, unknown>;
  if (payload.status === "error" || payload.code) throw new AppError(String(payload.message ?? "Twelve Data request failed."), 502);
  const last = toPaise(payload.close);
  if (!last) throw new AppError("Twelve Data did not return a price.", 502);
  const session = nseCashSession(now, holidays);
  const explicit = typeof payload.is_market_open === "boolean" ? payload.is_market_open : session.open;
  const spread = Math.max(1, DEFAULT_CHARGES.spreadBps);
  return {
    symbol,
    lastPaise: last,
    bidPaise: applyAdverseSlippage(last, "SELL", Math.floor(spread / 2), 5n),
    askPaise: applyAdverseSlippage(last, "BUY", Math.ceil(spread / 2), 5n),
    openPaise: toPaise(payload.open) ?? last,
    highPaise: toPaise(payload.high) ?? last,
    lowPaise: toPaise(payload.low) ?? last,
    previousClosePaise: toPaise(payload.previous_close) ?? last,
    volume: BigInt(Math.max(0, Math.round(Number(payload.volume) || 0))),
    asOf: payload.datetime ? new Date(String(payload.datetime)) : now,
    mode: process.env.MARKET_DATA_MODE === "realtime" ? "REALTIME" : "DELAYED",
    source: "twelvedata",
    marketOpen: explicit,
    message: process.env.MARKET_DATA_MODE === "realtime" ? "Provider marked as real-time by server configuration." : "Delayed or end-of-day provider data. Not a brokerage quote.",
  };
}

async function alphaQuote(symbol: string, now: Date, holidays: string[]): Promise<DemoQuote> {
  const key = process.env.MARKET_DATA_API_KEY;
  if (!key) throw new AppError("MARKET_DATA_API_KEY is not configured.", 503);
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const payload = (await fetchJson(url)) as { ["Global Quote"]?: Record<string, string>; Note?: string; Information?: string };
  if (payload.Note || payload.Information) throw new AppError(payload.Note ?? payload.Information ?? "Alpha Vantage limit reached.", 429);
  const quote = payload["Global Quote"] ?? {};
  const last = toPaise(quote["05. price"]);
  if (!last) throw new AppError("Alpha Vantage did not return a price for this symbol.", 502);
  const session = nseCashSession(now, holidays);
  return {
    symbol,
    lastPaise: last,
    bidPaise: last,
    askPaise: last,
    openPaise: toPaise(quote["02. open"]) ?? last,
    highPaise: toPaise(quote["03. high"]) ?? last,
    lowPaise: toPaise(quote["04. low"]) ?? last,
    previousClosePaise: toPaise(quote["08. previous close"]) ?? last,
    volume: BigInt(Math.max(0, Math.round(Number(quote["06. volume"]) || 0))),
    asOf: quote["07. latest trading day"] ? new Date(`${quote["07. latest trading day"]}T00:00:00Z`) : now,
    mode: "DELAYED",
    source: "alphavantage",
    marketOpen: session.open,
    message: "Alpha Vantage global quote. Treat as delayed or end-of-day, not a live Indian exchange feed.",
  };
}

export async function getQuote(symbol: string): Promise<DemoQuote> {
  const instrument = await prisma.instrument.findUnique({ where: { symbol: symbol.toUpperCase() } });
  if (!instrument || !instrument.isActive) throw new AppError("Instrument is not available.", 404);
  const holidays = await getHolidays();
  const now = new Date();
  const provider = configuredProvider();
  try {
    let quote: DemoQuote;
    if (provider === "demo") {
      quote = demoQuote({ symbol: instrument.symbol, name: instrument.name, exchange: instrument.exchange, sector: instrument.sector, basePaise: instrument.basePaise, tickPaise: instrument.tickPaise }, now, holidays);
    } else if (provider === "twelvedata") {
      quote = await twelveQuote(instrument.symbol, instrument.exchange, now, holidays);
    } else if (provider === "dhan") {
      quote = await dhanQuote(instrument.symbol, instrument.dhanSecurityId, now, holidays);
    } else {
      quote = await alphaQuote(instrument.symbol, now, holidays);
    }
    await remember(quote, instrument.id);
    await markStatus(quote.mode, quote.message);
    return quote;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market data failed.";
    await markStatus("UNAVAILABLE", message, message);
    throw error;
  }
}

function demoSpan(symbol: string, basePaise: number, now: Date, timeframe: ChartSpan): Candle[] {
  if (timeframe === "1h") return demoIntraday(symbol, basePaise, now, 60);
  if (timeframe === "1m" || timeframe === "3m" || timeframe === "5m") return demoIntraday(symbol, basePaise, now, 5);
  const count = timeframe === "1y" ? 252 : timeframe === "5y" ? 1260 : 1500;
  const daily = demoDailyCandles(symbol, basePaise, now, count);
  if (timeframe === "1w") return aggregatePeriod(daily, "week");
  if (timeframe === "1mo") return aggregatePeriod(daily, "month");
  return daily;
}

export async function getCandles(symbol: string, timeframe: ChartSpan): Promise<{ candles: Candle[]; mode: string; source: string; message: string }> {
  const instrument = await prisma.instrument.findUnique({ where: { symbol: symbol.toUpperCase() } });
  if (!instrument) throw new AppError("Instrument is not available.", 404);
  const provider = configuredProvider();
  const now = new Date();
  if (provider === "demo") {
    const candles = demoSpan(instrument.symbol, instrument.basePaise, now, timeframe);
    return { candles, mode: "DEMO", source: "tradelab-demo", message: "Demo candles are synthetic. They are not exchange history." };
  }
  if (provider === "dhan") return dhanCandles(instrument.symbol, instrument.dhanSecurityId, timeframe, now);
  const key = process.env.MARKET_DATA_API_KEY;
  if (!key) throw new AppError("MARKET_DATA_API_KEY is not configured.", 503);
  if (provider === "twelvedata") {
    const interval = timeframe === "1h" ? "1h" : timeframe === "5m" ? "5min" : timeframe === "1m" ? "1min" : "1day";
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(instrument.symbol)}&exchange=${encodeURIComponent(instrument.exchange)}&interval=${interval}&outputsize=180&apikey=${encodeURIComponent(key)}`;
    const payload = (await fetchJson(url)) as { values?: Array<Record<string, string>>; status?: string; message?: string };
    if (!payload.values) throw new AppError(payload.message ?? "No candle data returned.", 502);
    const candles = payload.values
      .map((row) => ({
        time: Math.floor(new Date(row.datetime).getTime() / 1000),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }))
      .filter((row) => Number.isFinite(row.time) && Number.isFinite(row.close))
      .reverse();
    return { candles, mode: process.env.MARKET_DATA_MODE === "realtime" ? "REALTIME" : "DELAYED", source: "twelvedata", message: "Provider candles. Check your plan's delay and redistribution rights." };
  }
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(instrument.symbol)}&apikey=${encodeURIComponent(key)}`;
  const payload = (await fetchJson(url)) as { ["Time Series (Daily)"]?: Record<string, Record<string, string>>; Note?: string };
  if (payload.Note) throw new AppError(payload.Note, 429);
  const series = payload["Time Series (Daily)"] ?? {};
  const candles = Object.entries(series)
    .map(([day, row]) => ({
      time: Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 1000),
      open: Number(row["1. open"]),
      high: Number(row["2. high"]),
      low: Number(row["3. low"]),
      close: Number(row["4. close"]),
      volume: Number(row["5. volume"]),
    }))
    .sort((a, b) => a.time - b.time);
  return { candles, mode: "HISTORICAL", source: "alphavantage", message: "Daily historical candles from Alpha Vantage. Intraday charts require a provider plan that includes them; this adapter returns the daily series." };
}

export async function searchInstruments(query: string) {
  const q = query.trim();
  const rows = await prisma.instrument.findMany({
    where: q
      ? { isActive: true, OR: [{ symbol: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
      : { isActive: true, sector: "EQ" },
    orderBy: { name: "asc" },
    take: 40,
    select: { symbol: true, name: true, exchange: true, sector: true, lotSize: true, tickPaise: true },
  });
  return [...rows].sort((a, b) => Number(/^\d/.test(a.symbol)) - Number(/^\d/.test(b.symbol)) || a.name.localeCompare(b.name));
}

export { DEMO_UNIVERSE };
