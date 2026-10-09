import { z } from "zod";
import { AppError, readJson } from "@/lib/http";
import { passwordSchema } from "@/lib/schemas";
import { mutation, query } from "@/server/http";
import { createTotp, hashPassword, newMfaSecret, requireUser, revokeCurrentSession } from "@/server/auth";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const GET = query(async () => {
  const user = await requireUser();
  return Response.json({ id: user.id, email: user.email, name: user.name, role: user.role, mfaEnabled: user.mfaEnabled, tradingEnabled: user.tradingEnabled, status: user.status });
});

export const POST = mutation(async (request) => {
  const user = await requireUser();
  const body = await request.json();
  if (body && typeof body === "object" && "enable" in body) {
    const actor = await requireUser(["SUPER_ADMIN", "INSTRUCTOR"]);
    const input = z.object({ enable: z.boolean(), code: z.string().optional(), secret: z.string().optional() }).parse(body);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!input.enable) {
      await prisma.user.update({ where: { id: actor.id }, data: { mfaEnabled: false, mfaSecret: null } });
      return Response.json({ ok: true, mfaEnabled: false });
    }
    const secret = input.secret || row.mfaSecret || newMfaSecret();
    if (!input.code) {
      return Response.json({ secret, uri: createTotp(row.email, secret).toString() });
    }
    if (createTotp(row.email, secret).validate({ token: input.code, window: 1 }) === null) throw new AppError("That code is not valid.", 401);
    await prisma.user.update({ where: { id: actor.id }, data: { mfaEnabled: true, mfaSecret: secret } });
    return Response.json({ ok: true, mfaEnabled: true });
  }
  const input = passwordSchema.parse(body);
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const matches = await compare(input.currentPassword, row.passwordHash);
  if (!matches) throw new AppError("Current password is incorrect.", 401);
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, tokenVersion: { increment: 1 } } });
  await revokeCurrentSession();
  return Response.json({ ok: true });
});

export const PUT = mutation(async (request) => {
  const user = await requireUser(["SUPER_ADMIN", "INSTRUCTOR"]);
  const input = await readJson(request, z.object({ enable: z.boolean(), code: z.string().optional(), secret: z.string().optional() }));
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!input.enable) {
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null } });
    return Response.json({ ok: true, mfaEnabled: false });
  }
  const secret = input.secret || row.mfaSecret || newMfaSecret();
  if (!input.code) {
    const totp = createTotp(row.email, secret);
    return Response.json({ secret, uri: totp.toString() });
  }
  const totp = createTotp(row.email, secret);
  if (totp.validate({ token: input.code, window: 1 }) === null) throw new AppError("That code is not valid.", 401);
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true, mfaSecret: secret } });
  return Response.json({ ok: true, mfaEnabled: true });
});
