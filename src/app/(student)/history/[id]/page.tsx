"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, tone } from "@/components/api";

type Trade = {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  direction: string;
  quantity: number;
  entryAt: string;
  exitAt: string;
  averageEntry: string;
  averageExit: string;
  gross: string;
  charges: string;
  net: string;
  ret: string;
  holdingSeconds: number;
  orderIds: string[];
  note: string;
  hasReceipt: boolean;
  capturedAt: string | null;
};

export default function TradeDetailPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<Trade | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!params.id) return;
    api<Trade>(`/api/trades/${params.id}`).then(setRow).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load this trade."));
  }, [params.id]);
  if (error) return <p className="text-sm text-loss">{error}</p>;
  if (!row) return <p className="text-sm text-muted">Loading the closed trade…</p>;
  const when = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  return (
    <article className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="border border-border bg-panel p-4 text-sm">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Virtual {row.direction} · {row.exchange}</p>
        <h1 className="mt-1 text-xl font-semibold">{row.symbol}</h1>
        <p className="text-muted">{row.name}</p>
        <dl className="mt-4 space-y-2">
          {[
            ["Quantity", String(row.quantity)],
            ["Opened", `${when(row.entryAt)} IST`],
            ["Average entry", `₹${row.averageEntry}`],
            ["Closed", `${when(row.exitAt)} IST`],
            ["Average exit", `₹${row.averageExit}`],
            ["Holding", holdLabel(row.holdingSeconds)],
            ["Gross", row.gross],
            ["Charges", row.charges],
            ["Net", row.net],
            ["Return", row.ret],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-t border-border pt-2">
              <dt className="text-muted">{label}</dt>
              <dd className={`font-mono ${label === "Net" || label === "Return" || label === "Gross" ? tone(value) : ""}`}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">Net uses weighted-average cost. Buy charges sit in the cost. Sell charges reduce the proceeds. Orders: {row.orderIds.join(", ") || "—"}.</p>
        {row.note ? <p className="mt-2">{row.note}</p> : null}
        <div className="mt-4 flex gap-3 text-sm">
          <Link className="text-primary" href={`/terminal?symbol=${row.symbol}`}>Open chart</Link>
          <Link className="text-primary" href="/history">All history</Link>
        </div>
      </section>
      <section className="border border-border bg-background p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Stored receipt{row.capturedAt ? ` · ${when(row.capturedAt)} IST` : ""}</span>
          <a className="text-primary" href={`/api/trades/${row.id}/receipt`} download={`${row.symbol}-trade.svg`}>Download</a>
        </div>
        {row.hasReceipt ? (
          // The receipt is an authenticated SVG served from the database, so a plain img request includes the session cookie.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/trades/${row.id}/receipt`} alt={`${row.symbol} closed-trade receipt`} className="w-full border border-border" />
        ) : (
          <button className="bg-primary px-3 py-2 text-sm text-on-primary" onClick={() => api(`/api/trades/${row.id}/receipt`, {}).then(() => api<Trade>(`/api/trades/${row.id}`).then(setRow))}>Create receipt</button>
        )}
      </section>
    </article>
  );
}

function holdLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
