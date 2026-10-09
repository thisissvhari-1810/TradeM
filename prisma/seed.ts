import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { DEMO_UNIVERSE } from "../src/lib/market/demo";
import { DEFAULT_CHARGES, DEFAULT_RISK, DEFAULT_STARTING_CAPITAL_PAISE } from "../src/lib/trading/settings";
import { lessons } from "./content";

const prisma = new PrismaClient();

async function main() {
  const paths = [
    { slug: "beginner", title: "Beginner", description: "Ownership, quotes, candles, and what indicators do not promise.", level: "BEGINNER" as const, sortOrder: 1 },
    { slug: "intermediate", title: "Intermediate", description: "Levels, trends, risk, size, and protective exits.", level: "INTERMEDIATE" as const, sortOrder: 2 },
    { slug: "advanced", title: "Advanced", description: "Diversification, behaviour, mistakes, and time horizon.", level: "ADVANCED" as const, sortOrder: 3 },
  ];
  for (const path of paths) {
    await prisma.learningPath.upsert({ where: { slug: path.slug }, create: path, update: path });
  }
  for (const [index, lesson] of lessons.entries()) {
    const path = await prisma.learningPath.findUniqueOrThrow({ where: { slug: lesson.path } });
    const saved = await prisma.lesson.upsert({
      where: { slug: lesson.slug },
      create: { slug: lesson.slug, pathId: path.id, title: lesson.title, summary: lesson.summary, body: lesson.body, level: lesson.level, sortOrder: index + 1, minutes: lesson.minutes, published: true },
      update: { title: lesson.title, summary: lesson.summary, body: lesson.body, level: lesson.level, minutes: lesson.minutes, published: true },
    });
    const quiz = await prisma.quiz.upsert({ where: { lessonId: saved.id }, create: { lessonId: saved.id, title: `${lesson.title} check` }, update: { title: `${lesson.title} check` } });
    await prisma.question.deleteMany({ where: { quizId: quiz.id } });
    await prisma.question.createMany({
      data: lesson.questions.map((question, questionIndex) => ({ quizId: quiz.id, prompt: question.prompt, options: question.options, correctIndex: question.correctIndex, explanation: question.explanation, sortOrder: questionIndex + 1 })),
    });
  }
  for (const instrument of DEMO_UNIVERSE) {
    await prisma.instrument.upsert({
      where: { symbol: instrument.symbol },
      create: { symbol: instrument.symbol, name: instrument.name, exchange: instrument.exchange, sector: instrument.sector, basePaise: instrument.basePaise, tickPaise: instrument.tickPaise, lotSize: 1, isActive: true },
      update: { name: instrument.name, sector: instrument.sector, basePaise: instrument.basePaise, isActive: true },
    });
  }
  const badges = [
    ["first-trade", "First fill", "Recorded a simulated buy."],
    ["first-journal", "Journal started", "Wrote a trade journal entry."],
    ["three-lessons", "Three lessons", "Completed three lessons."],
    ["perfect-quiz", "Perfect quiz", "Scored 100 on a lesson quiz."],
    ["risk-plan", "Risk plan", "Recorded both an exit and a risk/reward note."],
    ["path-beginner", "Beginner path", "Completed the beginner path."],
    ["path-intermediate", "Intermediate path", "Completed the intermediate path."],
    ["path-advanced", "Advanced path", "Completed the advanced path."],
  ] as const;
  for (const [slug, name, description] of badges) {
    await prisma.badge.upsert({ where: { slug }, create: { slug, name, description }, update: { name, description } });
  }
  await prisma.challenge.upsert({
    where: { id: "seed-challenge-plan" },
    create: { id: "seed-challenge-plan", title: "Write the exit first", description: "Before the next simulated buy, record the planned exit and the amount of virtual capital at risk.", level: "BEGINNER", prompt: "Place no order until the journal contains an exit and a risk amount." },
    update: { title: "Write the exit first" },
  });
  await prisma.appSetting.upsert({ where: { key: "trading.startingCapitalPaise" }, create: { key: "trading.startingCapitalPaise", value: DEFAULT_STARTING_CAPITAL_PAISE.toString() }, update: {} });
  await prisma.appSetting.upsert({ where: { key: "trading.charges" }, create: { key: "trading.charges", value: DEFAULT_CHARGES }, update: {} });
  await prisma.appSetting.upsert({ where: { key: "trading.risk" }, create: { key: "trading.risk", value: DEFAULT_RISK }, update: {} });
  await prisma.appSetting.upsert({ where: { key: "market.holidays" }, create: { key: "market.holidays", value: [] }, update: {} });

  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const demoAllowed = process.env.ENABLE_DEMO_SEED === "true" && (environment === "development" || environment === "preview");
  if (!demoAllowed) {
    console.info("Demo accounts were not created. Set ENABLE_DEMO_SEED=true only for development or preview.");
    return;
  }
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) throw new Error("SEED_DEMO_PASSWORD is required when ENABLE_DEMO_SEED=true.");
  const passwordHash = await hash(password, 12);
  const instructor = await prisma.user.upsert({
    where: { email: "instructor.demo@tradelab.local" },
    create: { email: "instructor.demo@tradelab.local", name: "Demo Instructor", passwordHash, role: "INSTRUCTOR", tradingEnabled: false },
    update: {},
  });
  const classroom = await prisma.class.upsert({
    where: { id: "seed-demo-class" },
    create: { id: "seed-demo-class", name: "Demo classroom", description: "Preview and development only.", instructorId: instructor.id },
    update: { instructorId: instructor.id },
  });
  for (const [email, name] of [
    ["student.demo@tradelab.local", "Demo Student"],
    ["student2.demo@tradelab.local", "Demo Student Two"],
  ] as const) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;
    const student = await prisma.user.create({ data: { email, name, passwordHash, role: "STUDENT" } });
    const account = await prisma.virtualAccount.create({ data: { userId: student.id, currency: "INR" } });
    const period = await prisma.practicePeriod.create({ data: { accountId: account.id, sequence: 1, label: "Practice period 1", startingCapital: DEFAULT_STARTING_CAPITAL_PAISE } });
    await prisma.virtualAccount.update({ where: { id: account.id }, data: { currentPeriodId: period.id, cashAvailable: DEFAULT_STARTING_CAPITAL_PAISE } });
    await prisma.ledgerEntry.create({
      data: { accountId: account.id, practicePeriodId: period.id, type: "OPENING_BALANCE", cashDelta: DEFAULT_STARTING_CAPITAL_PAISE, reservedDelta: 0n, cashAvailableAfter: DEFAULT_STARTING_CAPITAL_PAISE, cashReservedAfter: 0n, reason: "Demo starting capital" },
    });
    await prisma.watchlist.create({ data: { userId: student.id, name: "Default" } });
    await prisma.classMembership.create({ data: { classId: classroom.id, userId: student.id } });
  }
  console.info("Demo accounts use the password in SEED_DEMO_PASSWORD. They are labelled .demo@tradelab.local and are not for production.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
