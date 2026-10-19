import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import { calculateCharges } from "@/lib/trading/fees";
import { DEFAULT_CHARGES } from "@/lib/trading/settings";

/** Demo fills stay in the browser. This is not an order route. */
export const DEMO_ORDER_ROUTE: null = null;

export const DEMO_START_PAISE = 100_000_000;

export type DemoCandle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type DemoFill = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  pricePaise: number;
  time: number;
  chargesPaise: number;
};

export type DemoPosition = { symbol: string; quantity: number; avgPaise: number };

export type DemoBook = {
  cashPaise: number;
  realizedPaise: number;
  positions: DemoPosition[];
  fills: DemoFill[];
};

export function emptyDemoBook(): DemoBook {
  return { cashPaise: DEMO_START_PAISE, realizedPaise: 0, positions: [], fills: [] };
}

export function loadDemoBook(raw: string | null): DemoBook {
  if (!raw) return emptyDemoBook();
  try {
    const parsed = JSON.parse(raw) as Partial<DemoBook>;
    if (!parsed || typeof parsed.cashPaise !== "number" || !Number.isFinite(parsed.cashPaise) || !Array.isArray(parsed.positions) || !Array.isArray(parsed.fills)) return emptyDemoBook();
    return {
      cashPaise: parsed.cashPaise,
      realizedPaise: typeof parsed.realizedPaise === "number" && Number.isFinite(parsed.realizedPaise) ? parsed.realizedPaise : 0,
      positions: parsed.positions.filter((item) => item && typeof item.symbol === "string" && Number.isInteger(item.quantity) && item.quantity > 0 && Number.isFinite(item.avgPaise)),
      fills: parsed.fills.filter((item) => item && (item.side === "BUY" || item.side === "SELL") && Number.isInteger(item.quantity) && item.quantity > 0),
    };
  } catch {
    return emptyDemoBook();
  }
}

/** Latest candle the replay is allowed to reveal. After the close, the loaded history is the tape. */
export function revealLimit(candles: DemoCandle[], nowSec: number, marketOpen: boolean, delaySec: number): number | null {
  if (!candles.length || !Number.isFinite(delaySec) || delaySec < 0 || !Number.isFinite(nowSec)) return null;
  const last = candles[candles.length - 1].time;
  const cutoff = marketOpen ? nowSec - delaySec : last;
  let found: number | null = null;
  for (const candle of candles) {
    if (candle.time <= cutoff) found = candle.time;
  }
  return found;
}

/** Where playback starts. While the session is open this is the delayed present. After the close it sits one delay before the last candle. */
export function initialPlayhead(candles: DemoCandle[], nowSec: number, marketOpen: boolean, delaySec: number): number | null {
  const limit = revealLimit(candles, nowSec, marketOpen, delaySec);
  if (limit == null) return null;
  if (marketOpen) return limit;
  const target = limit - delaySec;
  let found: number | null = null;
  for (const candle of candles) {
    if (candle.time <= target && candle.time <= limit) found = candle.time;
  }
  return found ?? (candles[0].time <= limit ? candles[0].time : null);
}

export function sliceTo(candles: DemoCandle[], until: number | null): DemoCandle[] {
  if (until == null) return candles;
  return candles.filter((candle) => candle.time <= until);
}

export function stepPlayhead(candles: DemoCandle[], playhead: number | null, direction: -1 | 1, limit: number | null): number | null {
  if (limit == null) return playhead;
  const tape = candles.filter((candle) => candle.time <= limit);
  if (!tape.length) return null;
  if (playhead == null) return direction < 0 ? tape[0].time : tape[tape.length - 1].time;
  const index = tape.findIndex((candle) => candle.time === playhead);
  const start = index >= 0 ? index : tape.findLastIndex((candle) => candle.time <= playhead);
  const next = (start < 0 ? 0 : start) + direction;
  if (next < 0 || next >= tape.length) return tape[start < 0 ? 0 : start].time;
  return tape[next].time;
}

export function candleChange(close: number, basis: number): { change: number; percent: number } {
  const change = close - basis;
  const percent = basis ? (change / basis) * 100 : 0;
  return { change, percent };
}

export function formatIst(unixSec: number): string {
  const label = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(unixSec * 1000));
  return `${label} IST`;
}

export function applyDemoFill(
  book: DemoBook,
  order: { id: string; symbol: string; side: "BUY" | "SELL"; quantity: number; candle: DemoCandle; playheadTime: number; revealTime: number },
): { ok: true; book: DemoBook } | { ok: false; error: string } {
  if (DEMO_ORDER_ROUTE !== null) return { ok: false, error: "Demo orders have no route." };
  const symbol = order.symbol.trim().toUpperCase();
  if (!symbol || !Number.isInteger(order.quantity) || order.quantity <= 0) return { ok: false, error: "Enter a whole number of shares." };
  if (order.candle.time !== order.playheadTime || order.candle.time > order.revealTime) {
    return { ok: false, error: "Demo orders fill on the candle at the replay time. Later candles stay unused." };
  }
  if (!Number.isFinite(order.candle.close) || order.candle.close <= 0) return { ok: false, error: "This candle has no price." };
  const pricePaise = Number(rupeesToPaise(order.candle.close.toFixed(2)));
  const notional = BigInt(pricePaise) * BigInt(order.quantity);
  const chargesPaise = Number(calculateCharges(order.side, notional, DEFAULT_CHARGES).total);
  const position = book.positions.find((item) => item.symbol === symbol) ?? null;
  if (order.side === "SELL") {
    if (!position || position.quantity < order.quantity) return { ok: false, error: "Sell quantity is above the demo shares you hold." };
    const proceeds = pricePaise * order.quantity - chargesPaise;
    const realized = (pricePaise - position.avgPaise) * order.quantity - chargesPaise;
    const nextQty = position.quantity - order.quantity;
    return {
      ok: true,
      book: {
        cashPaise: book.cashPaise + proceeds,
        realizedPaise: book.realizedPaise + realized,
        positions: nextQty > 0 ? book.positions.map((item) => item.symbol === symbol ? { ...item, quantity: nextQty } : item) : book.positions.filter((item) => item.symbol !== symbol),
        fills: [...book.fills, { id: order.id, symbol, side: "SELL", quantity: order.quantity, pricePaise, time: order.candle.time, chargesPaise }],
      },
    };
  }
  const cost = pricePaise * order.quantity + chargesPaise;
  if (cost > book.cashPaise) return { ok: false, error: "Demo buying power cannot cover this fill." };
  const nextQty = (position?.quantity ?? 0) + order.quantity;
  const nextAvg = Math.round((((position?.avgPaise ?? 0) * (position?.quantity ?? 0)) + pricePaise * order.quantity) / nextQty);
  const nextPosition = { symbol, quantity: nextQty, avgPaise: nextAvg };
  return {
    ok: true,
    book: {
      cashPaise: book.cashPaise - cost,
      realizedPaise: book.realizedPaise,
      positions: position ? book.positions.map((item) => item.symbol === symbol ? nextPosition : item) : [...book.positions, nextPosition],
      fills: [...book.fills, { id: order.id, symbol, side: "BUY", quantity: order.quantity, pricePaise, time: order.candle.time, chargesPaise }],
    },
  };
}

export function demoUnrealized(book: DemoBook, marksPaise: Record<string, number>): number {
  return book.positions.reduce((total, position) => {
    const mark = marksPaise[position.symbol];
    if (!Number.isFinite(mark)) return total;
    return total + (mark - position.avgPaise) * position.quantity;
  }, 0);
}

export function formatDemoRupees(paise: number): string {
  return paiseToRupees(BigInt(Math.round(paise)));
}
