import { prisma } from "@/lib/prisma";
import { DEFAULT_CHARGES, DEFAULT_RISK, DEFAULT_STARTING_CAPITAL_PAISE, type ChargeSettings, type RiskSettings, type TradingSettings } from "@/lib/trading/settings";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function getTradingSettings(): Promise<TradingSettings> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: ["trading.startingCapitalPaise", "trading.charges", "trading.risk", "market.holidays"] } },
  });
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const startingRaw = map.get("trading.startingCapitalPaise");
  const startingCapitalPaise = typeof startingRaw === "string" || typeof startingRaw === "number" ? BigInt(startingRaw) : DEFAULT_STARTING_CAPITAL_PAISE;
  const charges = { ...DEFAULT_CHARGES, ...asRecord(map.get("trading.charges")) } as ChargeSettings;
  const riskInput = asRecord(map.get("trading.risk"));
  const risk = { ...DEFAULT_RISK, ...riskInput } as RiskSettings;
  if (Array.isArray(riskInput.allowedOrderTypes)) {
    risk.allowedOrderTypes = riskInput.allowedOrderTypes.filter((item): item is RiskSettings["allowedOrderTypes"][number] =>
      ["MARKET", "LIMIT", "STOP", "STOP_LIMIT", "TARGET"].includes(String(item)),
    );
  }
  return { startingCapitalPaise, charges, risk };
}

export async function getHolidays(): Promise<string[]> {
  const row = await prisma.appSetting.findUnique({ where: { key: "market.holidays" } });
  return Array.isArray(row?.value) ? row.value.filter((item): item is string => typeof item === "string") : [];
}

export function configuredProvider(): "demo" | "twelvedata" | "alphavantage" {
  const raw = (process.env.MARKET_DATA_PROVIDER ?? "demo").toLowerCase();
  if (raw === "twelvedata" || raw === "alphavantage") return raw;
  return "demo";
}
