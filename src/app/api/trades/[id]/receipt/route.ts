import { connection } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/http";
import { requireUser } from "@/server/auth";
import { receiptFor } from "@/server/closed-trades";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connection();
    const user = await requireUser(["STUDENT", "SUPER_ADMIN"]);
    const { id } = await context.params;
    const svg = await receiptFor(user, id);
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connection();
    assertSameOrigin(request);
    const user = await requireUser(["STUDENT", "SUPER_ADMIN"]);
    const { id } = await context.params;
    await receiptFor(user, id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
