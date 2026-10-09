import { connection } from "next/server";
import { AppError } from "@/lib/http";
import { evaluateOpenOrders } from "@/server/trading";
import { getStudentBundle } from "@/server/portfolio";
import { refreshCompetition } from "@/server/competitions";
import { prisma } from "@/lib/prisma";

function assertCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) throw new AppError("Unauthorized.", 401);
}

async function runCron(request: Request) {
  try {
    await connection();
    assertCron(request);
    const job = new URL(request.url).searchParams.get("job") ?? "evaluate";
    if (job === "snapshots") {
      const accounts = await prisma.virtualAccount.findMany({ select: { userId: true }, take: 100 });
      for (const account of accounts) await getStudentBundle(account.userId).catch(() => undefined);
      return Response.json({ ok: true, accounts: accounts.length });
    }
    if (job === "competitions") {
      const competitions = await prisma.competition.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
      for (const competition of competitions) await refreshCompetition(competition.id);
      return Response.json({ ok: true, competitions: competitions.length });
    }
    return Response.json(await evaluateOpenOrders());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed.";
    const status = error instanceof AppError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}

export function GET(request: Request) {
  return runCron(request);
}

export function POST(request: Request) {
  return runCron(request);
}
