import { mutation } from "@/server/http";
import { revokeCurrentSession } from "@/server/auth";

export const POST = mutation(async () => {
  await revokeCurrentSession();
  return Response.json({ ok: true });
});
