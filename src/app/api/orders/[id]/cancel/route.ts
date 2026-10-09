import { connection } from "next/server";
import { jsonError } from "@/lib/http";
import { assertSameOrigin } from "@/lib/http";
import { requireUser } from "@/server/auth";
import { cancelOrder } from "@/server/trading";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connection();
    assertSameOrigin(request);
    const user = await requireUser(["STUDENT", "SUPER_ADMIN"]);
    const { id } = await context.params;
    const order = await cancelOrder(user, id);
    return Response.json({ id: order.id, status: order.status });
  } catch (error) {
    return jsonError(error);
  }
}
