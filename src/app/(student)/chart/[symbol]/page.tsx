import { redirect } from "next/navigation";

export const instant = false;

export default async function ChartShortcut({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const ticker = decodeURIComponent(symbol).split(":").pop() || symbol;
  redirect(`/terminal?symbol=${encodeURIComponent(ticker.toUpperCase())}`);
}
