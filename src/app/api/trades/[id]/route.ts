import { connection } from "next/server";
import { jsonError } from "@/lib/http";
import { requireUser } from "@/server/auth";
import { getClosedTrade } from "@/server/closed-trades";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connection();
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await getClosedTrade(user, id));
  } catch (error) {
    return jsonError(error);
  }
}
