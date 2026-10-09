import { query } from "@/server/http";
import { requireUser } from "@/server/auth";
import { getCandles } from "@/server/market";

export const GET = query(async (request) => {
  await requireUser();
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? "";
  const timeframe = url.searchParams.get("timeframe");
  const tf = timeframe === "5m" || timeframe === "15m" || timeframe === "1h" || timeframe === "1d" ? timeframe : "1d";
  return Response.json(await getCandles(symbol, tf));
});
