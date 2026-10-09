import { query } from "@/server/http";
import { requireUser } from "@/server/auth";
import { searchInstruments } from "@/server/market";

export const GET = query(async (request) => {
  await requireUser();
  return Response.json(await searchInstruments(new URL(request.url).searchParams.get("q") ?? ""));
});
