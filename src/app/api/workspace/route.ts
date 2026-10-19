import { z } from "zod";
import { alertSchema, journalSchema } from "@/lib/schemas";
import { AppError } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";
import { mutation, query } from "@/server/http";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { getAnalytics } from "@/server/portfolio";
import { completeLesson, getLesson, learningCatalog, reviewJournal, saveJournal, submitQuiz } from "@/server/learning";
import { joinCompetition, listCompetitions, refreshCompetition } from "@/server/competitions";

export const GET = query(async (request) => {
  const user = await requireUser();
  const view = new URL(request.url).searchParams.get("view");
  if (view === "analytics") {
    if (user.role !== "STUDENT") throw new AppError("Analytics are available on student accounts.", 403);
    return Response.json(await getAnalytics(user.id));
  }
  if (view === "learn") return Response.json(await learningCatalog(user.id));
  if (view === "lesson") return Response.json(await getLesson(user.id, new URL(request.url).searchParams.get("slug") ?? ""));
  if (view === "competitions") return Response.json(await listCompetitions(user));
  if (view === "watchlist") {
    const list = await prisma.watchlist.findFirst({ where: { userId: user.id, name: "Default" }, include: { items: { include: { instrument: true } } } });
    return Response.json(list?.items.map((item) => ({ symbol: item.instrument.symbol, name: item.instrument.name, exchange: item.instrument.exchange })) ?? []);
  }
  if (view === "notifications") {
    const notes = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40 });
    return Response.json(notes.map((note) => ({ id: note.id, title: note.title, body: note.body, href: note.href, read: Boolean(note.readAt), createdAt: note.createdAt.toISOString() })));
  }
  if (view === "alerts") {
    const alerts = await prisma.priceAlert.findMany({ where: { userId: user.id }, include: { instrument: true }, orderBy: { createdAt: "desc" } });
    return Response.json(alerts.map((alert) => ({ id: alert.id, symbol: alert.instrument.symbol, condition: alert.condition, target: (Number(alert.targetPaise) / 100).toFixed(2), status: alert.status, note: alert.note })));
  }
  const journals = await prisma.journalEntry.findMany({
    where:
      user.role === "SUPER_ADMIN"
        ? {}
        : user.role === "INSTRUCTOR"
          ? { user: { memberships: { some: { class: { instructorId: user.id } } } } }
          : { userId: user.id },
    include: { feedback: { include: { author: { select: { name: true } } } }, order: { include: { instrument: true } }, user: { select: { name: true, id: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json(
    journals.map((entry) => ({
      id: entry.id,
      thesis: entry.thesis,
      expectedMove: entry.expectedMove,
      plannedExit: entry.plannedExit,
      riskReward: entry.riskReward,
      emotion: entry.emotion,
      lesson: entry.lesson,
      mistakeTag: entry.mistakeTag,
      createdAt: entry.createdAt.toISOString(),
      student: entry.user.name,
      symbol: entry.order?.instrument.symbol ?? null,
      feedback: entry.feedback.map((item) => ({ body: item.body, author: item.author.name, createdAt: item.createdAt.toISOString() })),
    })),
  );
});

export const POST = mutation(async (request) => {
  const user = await requireUser();
  const body = await request.json();
  const action = typeof body?.action === "string" ? body.action : "journal";
  if (action === "quiz") return Response.json(await submitQuiz(user.id, z.string().parse(body.slug), z.array(z.number().int()).parse(body.answers)));
  if (action === "complete") return Response.json(await completeLesson(user.id, z.string().parse(body.slug)));
  if (action === "join") {
    const competitionId = z.string().parse(body.competitionId);
    await joinCompetition(user, competitionId);
    await refreshCompetition(competitionId);
    return Response.json({ ok: true });
  }
  if (action === "feedback") {
    await reviewJournal(user, z.string().parse(body.journalId), z.string().trim().min(2).max(2000).parse(body.body));
    return Response.json({ ok: true });
  }
  if (action === "watchlist") {
    const input = z.object({ symbol: z.string(), remove: z.boolean().optional() }).parse(body);
    const instrument = await prisma.instrument.findUnique({ where: { symbol: input.symbol.toUpperCase() } });
    if (!instrument) throw new AppError("Instrument not found.", 404);
    const list = await prisma.watchlist.upsert({ where: { userId_name: { userId: user.id, name: "Default" } }, create: { userId: user.id, name: "Default" }, update: {} });
    if (input.remove) await prisma.watchlistItem.deleteMany({ where: { watchlistId: list.id, instrumentId: instrument.id } });
    else {
      await prisma.watchlistItem.upsert({
        where: { watchlistId_instrumentId: { watchlistId: list.id, instrumentId: instrument.id } },
        create: { watchlistId: list.id, instrumentId: instrument.id },
        update: {},
      });
    }
    return Response.json({ ok: true });
  }
  if (action === "alert") {
    const input = alertSchema.parse(body);
    const instrument = await prisma.instrument.findUnique({ where: { symbol: input.symbol.toUpperCase() } });
    if (!instrument) throw new AppError("Instrument not found.", 404);
    const alert = await prisma.priceAlert.create({
      data: { userId: user.id, instrumentId: instrument.id, condition: input.condition, targetPaise: rupeesToPaise(input.targetRupees), note: input.note ?? "" },
    });
    return Response.json({ id: alert.id });
  }
  if (action === "notification-read") {
    const id = typeof body.id === "string" ? body.id : "";
    if (id) await prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    else await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return Response.json({ ok: true });
  }
  if (action === "alert-cancel") {
    const id = z.string().parse(body.id);
    await prisma.priceAlert.updateMany({ where: { id, userId: user.id, status: "ACTIVE" }, data: { status: "CANCELLED" } });
    return Response.json({ ok: true });
  }
  const input = journalSchema.parse(body);
  const entry = await saveJournal(user, input);
  return Response.json({ id: entry.id });
});
