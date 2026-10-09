import { connection } from "next/server";
import { accessSchema, classSchema, competitionSchema, fundsSchema, lessonSchema, reasonSchema, userCreateSchema } from "@/lib/schemas";
import { AppError, clientIp, jsonError, assertSameOrigin } from "@/lib/http";
import { rupeesToPaise } from "@/lib/money";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { createManagedUser, setUserAccess } from "@/server/users";
import { adjustFunds, resetPracticePeriod } from "@/server/trading";
import { configuredProvider, getTradingSettings } from "@/server/settings";
import { paiseToRupees } from "@/lib/money";

async function guard(request: Request) {
  assertSameOrigin(request);
  const user = await requireUser(["SUPER_ADMIN", "INSTRUCTOR"]);
  return user;
}

export async function POST(request: Request) {
  try {
    await connection();
    const actor = await guard(request);
    const body = await request.json();
    const action = String(body?.action ?? "");
    const ip = clientIp(request);
    if (action === "create-user") {
      const input = userCreateSchema.parse(body);
      return Response.json(await createManagedUser(actor, input, ip));
    }
    if (action === "access") {
      const input = accessSchema.parse(body);
      return Response.json(await setUserAccess(actor, zUser(body.userId), input, ip));
    }
    if (action === "funds") {
      if (!can(actor.role, "funds.adjust")) throw new AppError("Only a super admin can adjust virtual funds.", 403);
      const input = fundsSchema.parse(body);
      const amount = rupeesToPaise(input.amountRupees);
      const signed = input.direction === "debit" ? -amount : amount;
      if (signed === 0n) throw new AppError("Amount must not be zero.");
      await adjustFunds(actor, zUser(body.userId), signed, input.reason, ip);
      return Response.json({ ok: true });
    }
    if (action === "reset") {
      if (!can(actor.role, "accounts.reset")) throw new AppError("Only a super admin can reset a practice period.", 403);
      const input = reasonSchema.parse(body);
      await resetPracticePeriod(actor, zUser(body.userId), input.reason, ip);
      return Response.json({ ok: true });
    }
    if (action === "class") {
      if (!can(actor.role, "classes.manage")) throw new AppError("You cannot manage classes.", 403);
      const input = classSchema.parse(body);
      const created = await prisma.class.create({
        data: { name: input.name, description: input.description ?? "", instructorId: actor.role === "INSTRUCTOR" ? actor.id : input.instructorId || null },
      });
      await prisma.auditLog.create({ data: { actorId: actor.id, action: "class.create", targetType: "Class", targetId: created.id, reason: input.name, ipAddress: ip } });
      return Response.json({ id: created.id });
    }
    if (action === "enroll") {
      if (!can(actor.role, "classes.manage")) throw new AppError("You cannot manage classes.", 403);
      const classId = zUser(body.classId);
      const userId = zUser(body.userId);
      if (actor.role === "INSTRUCTOR") {
        const owned = await prisma.class.findFirst({ where: { id: classId, instructorId: actor.id } });
        if (!owned) throw new AppError("That class is not assigned to you.", 403);
      }
      await prisma.classMembership.create({ data: { classId, userId } });
      return Response.json({ ok: true });
    }
    if (action === "lesson") {
      if (!can(actor.role, "content.manage")) throw new AppError("You cannot edit learning content.", 403);
      const input = lessonSchema.parse(body);
      const path = await prisma.learningPath.findUnique({ where: { slug: input.pathSlug } });
      if (!path) throw new AppError("Learning path not found.", 404);
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const lesson = await prisma.lesson.create({
        data: { pathId: path.id, slug, title: input.title, summary: input.summary, body: input.body, level: input.level, sortOrder: 100, videoUrl: input.videoUrl ?? "", authorId: actor.id },
      });
      return Response.json({ id: lesson.id, slug: lesson.slug });
    }
    if (action === "competition") {
      if (!can(actor.role, "competitions.manage")) throw new AppError("You cannot create competitions.", 403);
      const input = competitionSchema.parse(body);
      const created = await prisma.competition.create({
        data: {
          title: input.title,
          description: input.description ?? "",
          classId: input.classId || null,
          status: "ACTIVE",
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          returnWeight: input.returnWeight,
          drawdownWeight: input.drawdownWeight,
          learningWeight: input.learningWeight,
          createdById: actor.id,
        },
      });
      await prisma.auditLog.create({ data: { actorId: actor.id, action: "competition.create", targetType: "Competition", targetId: created.id, reason: input.title, ipAddress: ip } });
      return Response.json({ id: created.id });
    }
    if (action === "settings") {
      if (!can(actor.role, "settings.manage")) throw new AppError("Only a super admin can change settings.", 403);
      const key = zUser(body.key);
      const allowed = ["trading.startingCapitalPaise", "trading.charges", "trading.risk", "market.holidays"];
      if (!allowed.includes(key)) throw new AppError("That setting cannot be changed here.");
      await prisma.appSetting.upsert({ where: { key }, create: { key, value: body.value, updatedById: actor.id }, update: { value: body.value, updatedById: actor.id } });
      await prisma.auditLog.create({ data: { actorId: actor.id, action: "settings.update", targetType: "AppSetting", targetId: key, reason: "Configuration updated.", after: body.value, ipAddress: ip } });
      return Response.json({ ok: true });
    }
    if (action === "instrument") {
      if (!can(actor.role, "settings.manage")) throw new AppError("Only a super admin can change instruments.", 403);
      const symbol = String(body.symbol ?? "").toUpperCase();
      const instrument = await prisma.instrument.update({ where: { symbol }, data: { isActive: Boolean(body.isActive) } });
      await prisma.auditLog.create({ data: { actorId: actor.id, action: "instrument.update", targetType: "Instrument", targetId: instrument.id, reason: body.isActive ? "Enabled" : "Disabled", ipAddress: ip } });
      return Response.json({ ok: true });
    }
    throw new AppError("Unknown admin action.", 404);
  } catch (error) {
    return jsonError(error);
  }
}

function zUser(value: unknown): string {
  if (typeof value !== "string" || value.length < 5) throw new AppError("A valid id is required.");
  return value;
}

function csv(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export async function GET(request: Request) {
  try {
    await connection();
    const actor = await requireUser(["SUPER_ADMIN", "INSTRUCTOR"]);
    const view = new URL(request.url).searchParams.get("view");
    if (view === "users") {
      const q = new URL(request.url).searchParams.get("q") ?? "";
      const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") ?? "1"));
      const where = {
        ...(actor.role === "INSTRUCTOR" ? { role: "STUDENT" as const, memberships: { some: { class: { instructorId: actor.id } } } } : {}),
        ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {}),
      };
      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: { id: true, name: true, email: true, role: true, status: true, tradingEnabled: true, createdAt: true, mfaEnabled: true, account: { select: { cashAvailable: true, cashReserved: true, currentPeriod: { select: { label: true, startingCapital: true } } } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * 20,
          take: 20,
        }),
      ]);
      return Response.json({
        total,
        page,
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          tradingEnabled: user.tradingEnabled,
          mfaEnabled: user.mfaEnabled,
          createdAt: user.createdAt.toISOString(),
          period: user.account?.currentPeriod?.label ?? null,
          cashAvailable: user.account ? paiseToRupees(user.account.cashAvailable) : null,
          cashReserved: user.account ? paiseToRupees(user.account.cashReserved) : null,
          startingCapital: user.account?.currentPeriod ? paiseToRupees(user.account.currentPeriod.startingCapital) : null,
        })),
      });
    }
    if (view === "classes") {
      const classes = await prisma.class.findMany({
        where: actor.role === "INSTRUCTOR" ? { instructorId: actor.id } : {},
        include: { instructor: { select: { name: true } }, memberships: true },
        orderBy: { createdAt: "desc" },
      });
      return Response.json(classes.map((item) => ({ id: item.id, name: item.name, description: item.description, instructor: item.instructor?.name ?? "Unassigned", students: item.memberships.length })));
    }
    if (view === "audit") {
      if (!can(actor.role, "audit.read")) throw new AppError("Audit logs are limited to super admins.", 403);
      const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { email: true, name: true } } } });
      return Response.json(logs.map((log) => ({ id: log.id, at: log.createdAt.toISOString(), actor: log.actor?.email ?? "system", action: log.action, targetType: log.targetType, targetId: log.targetId, reason: log.reason, before: log.before, after: log.after })));
    }
    if (view === "settings") {
      const settings = await getTradingSettings();
      return Response.json({
        provider: configuredProvider(),
        startingCapital: paiseToRupees(settings.startingCapitalPaise),
        charges: settings.charges,
        risk: settings.risk,
      });
    }
    if (view === "health") {
      let database = "ok";
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        database = "error";
      }
      const market = await prisma.marketDataStatus.findUnique({ where: { id: "primary" } });
      return Response.json({ database, market, provider: configuredProvider(), now: new Date().toISOString() });
    }
    if (view === "orders") {
      if (!can(actor.role, "orders.inspect")) throw new AppError("You cannot inspect orders.", 403);
      const orders = await prisma.order.findMany({
        where: actor.role === "INSTRUCTOR" ? { account: { user: { memberships: { some: { class: { instructorId: actor.id } } } } } } : {},
        include: { instrument: true, account: { include: { user: { select: { name: true, email: true } } } } },
        orderBy: { submittedAt: "desc" },
        take: 100,
      });
      return Response.json(orders.map((order) => ({ id: order.id, student: order.account.user.name, email: order.account.user.email, symbol: order.instrument.symbol, side: order.side, type: order.type, quantity: order.quantity, status: order.status, submittedAt: order.submittedAt.toISOString(), reason: order.rejectionReason })));
    }
    if (view === "report") {
      if (!can(actor.role, "reports.export")) throw new AppError("Only a super admin can export reports.", 403);
      const orders = await prisma.order.findMany({
        include: { instrument: true, account: { include: { user: { select: { email: true, name: true } } } } },
        orderBy: { submittedAt: "desc" },
        take: 2000,
      });
      const lines = orders.map((order) =>
        [order.submittedAt.toISOString(), csv(order.account.user.name), order.account.user.email, order.instrument.symbol, order.side, order.type, order.quantity, order.status, order.avgFillPaise == null ? "" : paiseToRupees(order.avgFillPaise), paiseToRupees(order.chargesPaise), csv(order.rejectionReason ?? "")].join(","),
      );
      return new Response(["submittedAt,student,email,symbol,side,type,quantity,status,avgFill,charges,reason", ...lines].join("\n"), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=tradelab-orders.csv" },
      });
    }
    const [students, orders, openOrders] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "OPEN" } }),
    ]);
    return Response.json({ students, orders, openOrders, provider: configuredProvider() });
  } catch (error) {
    return jsonError(error);
  }
}
