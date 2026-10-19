import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

if (process.env.POSTGRES_PRISMA_URL) process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;

type Row = { id: string; symbol: string; name: string; series: string; lotSize: number; tickPaise: number; dhanSecurityId: string };

async function load(file: string) {
  const rows = new Map<string, Row>();
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let header = true;
  for await (const line of lines) {
    if (header) {
      header = false;
      continue;
    }
    const column = line.split(",");
    if (column.length < 16) continue;
    const [exchange, segment, securityId, instrument, , symbol, lot, custom, , , , tick, , , series, company] = column;
    if (exchange !== "NSE" || segment !== "E" || instrument !== "EQUITY") continue;
    const ticker = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9&-]{1,30}$/.test(ticker) || !securityId.trim()) continue;
    const name = (company || custom || ticker).trim().slice(0, 160) || ticker;
    rows.set(ticker, {
      id: randomUUID(),
      symbol: ticker,
      name,
      series: (series || "").trim().slice(0, 12),
      lotSize: Math.max(1, Math.round(Number(lot) || 1)),
      tickPaise: Math.max(1, Math.round(Number(tick) || 5)),
      dhanSecurityId: securityId.trim(),
    });
  }
  return [...rows.values()];
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass the scrip master CSV path.");
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`ALTER TABLE "Instrument" ADD COLUMN IF NOT EXISTS "dhanSecurityId" TEXT NOT NULL DEFAULT ''`);
  const rows = await load(file);
  const size = 400;
  for (let index = 0; index < rows.length; index += size) {
    const batch = rows.slice(index, index + size);
    const values = Prisma.join(batch.map((row) => Prisma.sql`(${row.id}, ${row.symbol}, ${row.name}, 'NSE', 'INR', ${row.series}, '', ${row.lotSize}, ${row.tickPaise}, true, ${row.dhanSecurityId}, 100, NOW(), NOW())`));
    await prisma.$executeRaw`
      INSERT INTO "Instrument" ("id", "symbol", "name", "exchange", "currency", "sector", "isin", "lotSize", "tickPaise", "isActive", "dhanSecurityId", "basePaise", "createdAt", "updatedAt")
      VALUES ${values}
      ON CONFLICT ("symbol") DO UPDATE SET
        "dhanSecurityId" = EXCLUDED."dhanSecurityId",
        "name" = EXCLUDED."name",
        "sector" = EXCLUDED."sector",
        "lotSize" = EXCLUDED."lotSize",
        "tickPaise" = EXCLUDED."tickPaise",
        "isActive" = true,
        "updatedAt" = NOW()
    `;
  }
  await prisma.instrument.update({ where: { symbol: "TATAMOTORS" }, data: { dhanSecurityId: "3456" } }).catch(() => undefined);
  const count = await prisma.instrument.count({ where: { exchange: "NSE", dhanSecurityId: { not: "" } } });
  console.log(`nseWithDhanId=${count}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Import failed.");
  process.exit(1);
});
