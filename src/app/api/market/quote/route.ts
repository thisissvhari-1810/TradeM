import { paiseToRupees } from "@/lib/money";
import { query } from "@/server/http";
import { requireUser } from "@/server/auth";
import { getQuote } from "@/server/market";

export const GET = query(async (request) => {
  await requireUser();
  const symbol = new URL(request.url).searchParams.get("symbol") ?? "";
  const quote = await getQuote(symbol);
  return Response.json({
    symbol: quote.symbol,
    last: paiseToRupees(quote.lastPaise),
    bid: paiseToRupees(quote.bidPaise),
    ask: paiseToRupees(quote.askPaise),
    open: paiseToRupees(quote.openPaise),
    high: paiseToRupees(quote.highPaise),
    low: paiseToRupees(quote.lowPaise),
    previousClose: paiseToRupees(quote.previousClosePaise),
    volume: quote.volume.toString(),
    asOf: quote.asOf.toISOString(),
    mode: quote.mode,
    source: quote.source,
    marketOpen: quote.marketOpen,
    message: quote.message,
  });
});
