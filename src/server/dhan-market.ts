import { AppError } from "@/lib/http";
import { applyAdverseSlippage, rupeesToPaise } from "@/lib/money";
import { nseCashSession } from "@/lib/market/clock";
import type { Candle, DemoQuote } from "@/lib/market/demo";
import { DEFAULT_CHARGES } from "@/lib/trading/settings";
import { getDhanAccessToken } from "@/server/settings";
import { aggregateMinutes, aggregatePeriod, type ChartSpan } from "@/lib/market/spans";

/** NSE equity security ids from the Dhan scrip master. TATAMOTORS follows the continuing passenger-vehicle scrip, TMPV. */
const SECURITY_ID: Record<string, string> = {
  RELIANCE: "2885",
  TCS: "11536",
  INFY: "1594",
  HDFCBANK: "1333",
  ICICIBANK: "4963",
  ITC: "1660",
  SBIN: "3045",
  TATAMOTORS: "3456",
  ASIANPAINT: "236",
  BHARTIARTL: "10604",
};

type Series = { open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[]; timestamp?: number[] };

function securityId(symbol: string, stored = "") {
  const id = stored.trim() || SECURITY_ID[symbol];
  if (!id) throw new AppError(`${symbol} is not on the Dhan NSE list.`, 404);
  return id;
}

function istStamp(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const day = `${read("year")}-${read("month")}-${read("day")}`;
  return { day, stamp: `${day} ${read("hour")}:${read("minute")}:${read("second")}` };
}

async function dhanPost(path: string, body: unknown) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "access-token": await getDhanAccessToken(),
  };
  const clientId = process.env.DHAN_CLIENT_ID?.trim();
  if (clientId) headers["client-id"] = clientId;
  const response = await fetch(`https://api.dhan.co/v2${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { errorMessage?: string; remarks?: string } | null;
  if (!response.ok) throw new AppError(payload?.errorMessage || payload?.remarks || `Dhan returned ${response.status}.`, 502);
  return payload;
}

function candlesFromSeries(series: Series): Candle[] {
  const times = series.timestamp ?? [];
  const candles: Candle[] = [];
  times.forEach((time, index) => {
    const open = series.open?.[index];
    const high = series.high?.[index];
    const low = series.low?.[index];
    const close = series.close?.[index];
    if (open == null || high == null || low == null || close == null) return;
    if (![time, open, high, low, close].every((value) => Number.isFinite(value) && value > 0)) return;
    candles.push({ time, open, high, low, close, volume: Math.max(0, Number(series.volume?.[index] ?? 0)) });
  });
  return candles;
}

async function dailyHistory(id: string, from: Date, to: Date) {
  const series = (await dhanPost("/charts/historical", {
    securityId: id,
    exchangeSegment: "NSE_EQ",
    instrument: "EQUITY",
    expiryCode: 0,
    oi: false,
    fromDate: istStamp(from).day,
    toDate: istStamp(to).day,
  })) as Series;
  return candlesFromSeries(series).sort((a, b) => a.time - b.time);
}

async function intradayHistory(id: string, interval: "1" | "5" | "60", from: Date, to: Date) {
  const start = istStamp(from);
  const end = istStamp(to);
  const series = (await dhanPost("/charts/intraday", {
    securityId: id,
    exchangeSegment: "NSE_EQ",
    instrument: "EQUITY",
    interval,
    oi: false,
    fromDate: `${start.day} 09:15:00`,
    toDate: end.stamp,
  })) as Series;
  return candlesFromSeries(series).sort((a, b) => a.time - b.time);
}

export async function dhanCandles(symbol: string, storedSecurityId: string, timeframe: ChartSpan, now: Date) {
  const id = securityId(symbol, storedSecurityId);
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (timeframe === "1m" || timeframe === "3m" || timeframe === "5m" || timeframe === "1h") {
    const days = timeframe === "1h" || timeframe === "5m" ? 90 : 30;
    const from = new Date(now.getTime() - days * 86_400_000);
    const interval = timeframe === "1h" ? "60" : timeframe === "5m" ? "5" : "1";
    let candles = await intradayHistory(id, interval, from, now);
    if (timeframe === "3m") candles = aggregateMinutes(candles, 3);
    if (!candles.length) throw new AppError("Dhan did not return intraday candles for this symbol.", 502);
    const label = timeframe === "1m" ? "1-minute" : timeframe === "3m" ? "3-minute" : timeframe === "5m" ? "5-minute" : "1-hour";
    return { candles, mode: "HISTORICAL" as const, source: "dhan", message: `Dhan ${label} candles for the last ${days} days. TradeLab orders stay virtual and are not sent to Dhan.` };
  }
  const from = timeframe === "1y"
    ? new Date(now.getTime() - 370 * 86_400_000)
    : timeframe === "5y"
      ? new Date(now.getTime() - 5 * 365 * 86_400_000)
      : new Date(Date.UTC(2005, 0, 1));
  let candles = await dailyHistory(id, from, tomorrow);
  if (timeframe === "1w") candles = aggregatePeriod(candles, "week");
  if (timeframe === "1mo") candles = aggregatePeriod(candles, "month");
  if (!candles.length) throw new AppError("Dhan did not return daily candles for this symbol.", 502);
  const span = timeframe === "1y" ? "one year" : timeframe === "5y" ? "five years" : timeframe === "1w" ? "weekly bars from the daily history" : timeframe === "1mo" ? "monthly bars from the daily history" : "the daily history since 2005";
  return { candles, mode: "HISTORICAL" as const, source: "dhan", message: `Dhan candles for ${span}. TradeLab orders stay virtual and are not sent to Dhan.` };
}

export async function dhanQuote(symbol: string, storedSecurityId: string, now: Date, holidays: string[]): Promise<DemoQuote> {
  const id = securityId(symbol, storedSecurityId);
  const session = nseCashSession(now, holidays);
  const clientId = process.env.DHAN_CLIENT_ID?.trim();
  const spread = Math.max(1, DEFAULT_CHARGES.spreadBps);
  if (!clientId) {
    const history = await dhanCandles(symbol, storedSecurityId, "1d", now);
    const last = history.candles.at(-1);
    const previous = history.candles.at(-2) ?? last;
    if (!last || !previous) throw new AppError("Dhan did not return a price for this symbol.", 502);
    const lastPaise = rupeesToPaise(last.close.toFixed(2));
    return {
      symbol,
      lastPaise,
      bidPaise: applyAdverseSlippage(lastPaise, "SELL", Math.floor(spread / 2), 5n),
      askPaise: applyAdverseSlippage(lastPaise, "BUY", Math.ceil(spread / 2), 5n),
      openPaise: rupeesToPaise(last.open.toFixed(2)),
      highPaise: rupeesToPaise(last.high.toFixed(2)),
      lowPaise: rupeesToPaise(last.low.toFixed(2)),
      previousClosePaise: rupeesToPaise(previous.close.toFixed(2)),
      volume: BigInt(Math.max(0, Math.round(last.volume))),
      asOf: new Date(last.time * 1000),
      mode: "HISTORICAL",
      source: "dhan",
      marketOpen: session.open,
      message: "Dhan daily close. Add DHAN_CLIENT_ID with the access token for a live snapshot. Orders stay inside TradeLab.",
    };
  }
  const payload = (await dhanPost("/marketfeed/ohlc", { NSE_EQ: [Number(id)] })) as {
    data?: { NSE_EQ?: Record<string, { last_price?: number; ohlc?: { open?: number; high?: number; low?: number; close?: number } }> };
  };
  const row = payload.data?.NSE_EQ?.[id];
  const last = row?.last_price;
  if (!last || !Number.isFinite(last)) throw new AppError("Dhan did not return a live price for this symbol.", 502);
  const lastPaise = rupeesToPaise(last.toFixed(2));
  const price = (value: number | undefined, fallback: bigint) => (value && Number.isFinite(value) && value > 0 ? rupeesToPaise(value.toFixed(2)) : fallback);
  return {
    symbol,
    lastPaise,
    bidPaise: applyAdverseSlippage(lastPaise, "SELL", Math.floor(spread / 2), 5n),
    askPaise: applyAdverseSlippage(lastPaise, "BUY", Math.ceil(spread / 2), 5n),
    openPaise: price(row.ohlc?.open, lastPaise),
    highPaise: price(row.ohlc?.high, lastPaise),
    lowPaise: price(row.ohlc?.low, lastPaise),
    previousClosePaise: price(row.ohlc?.close, lastPaise),
    volume: 0n,
    asOf: now,
    mode: "REALTIME",
    source: "dhan",
    marketOpen: session.open,
    message: "Dhan price snapshot. TradeLab orders stay virtual and are not sent to Dhan.",
  };
}
