import { z } from "zod";
import { emailSchema } from "@/lib/schemas";
import { AppError, readJson } from "@/lib/http";
import { mutation } from "@/server/http";
import { hashPassword, hashToken, newToken } from "@/server/auth";
import { prisma } from "@/lib/prisma";

const forgotSchema = z.object({ email: emailSchema });
const resetSchema = z.object({ token: z.string().min(20), password: z.string().min(10).max(128) });

async function deliver(email: string, link: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email, subject: "Reset your TradeLab password", text: `Use this link within 30 minutes: ${link}` }),
    });
    return;
  }
  if (process.env.NODE_ENV === "development") console.info(`TradeLab password reset for ${email}: ${link}`);
}

export const POST = mutation(async (request) => {
  const input = await readJson(request, forgotSchema);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (user && user.status !== "DISABLED") {
    const token = newToken();
    await prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    const origin = new URL(request.url).origin;
    const base = process.env.APP_URL ?? origin;
    await deliver(user.email, `${base}/reset-password?token=${token}`);
  }
  return Response.json({ ok: true, message: "If an account exists for that email, a reset link has been created." });
});

export const PUT = mutation(async (request) => {
  const input = await readJson(request, resetSchema);
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(input.token) } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) throw new AppError("This reset link is invalid or expired.", 400);
  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash, tokenVersion: { increment: 1 } } }),
    prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  return Response.json({ ok: true });
});
