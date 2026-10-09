import { setupSchema } from "@/lib/schemas";
import { AppError, readJson } from "@/lib/http";
import { mutation, query } from "@/server/http";
import { hashPassword, passwordsMatch } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export const GET = query(async () => {
  const existing = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  return Response.json({ setupRequired: existing === 0 });
});

export const POST = mutation(async (request) => {
  const existing = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (existing > 0) throw new AppError("Setup has already been completed.", 409);
  const token = process.env.SETUP_TOKEN;
  if (!token) throw new AppError("SETUP_TOKEN is not configured.", 503);
  const input = await readJson(request, setupSchema);
  if (!passwordsMatch(input.setupToken, token)) throw new AppError("Setup token is incorrect.", 401);
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, role: "SUPER_ADMIN", tradingEnabled: false },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "setup.bootstrap", targetType: "User", targetId: user.id, reason: "First super admin created." },
  });
  return Response.json({ ok: true, email: user.email });
});
