"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/components/api";
import { PageFrame } from "@/components/page-frame";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-panel">
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

type Activity = {
  orders: Array<{ id: string; symbol: string; side: string; type: string; quantity: number; filledQuantity: number; status: string; avgFill: string | null; charges: string; reason: string | null; submittedAt: string }>;
  executions: Array<{ id: string; symbol: string; side: string; quantity: number; price: string; charges: string; realized: string; mode: string; executedAt: string }>;
  ledger: Array<{ id: string; type: string; cashDelta: string; reason: string; createdAt: string }>;
};

export default function OrdersPage() {
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function load() {
    api<Activity>("/api/orders").then(setData).catch((caught) => setError(caught.message));
  }
  useEffect(load, []);
  if (error) return <p className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading orders…</p>;
  return (
    <PageFrame kicker="Activity" title="Orders and ledger" lede="Open orders, fills, and every cash movement in the current practice period.">
      {message ? <p className="rounded-lg border border-profit/40 bg-profit/10 px-4 py-3 text-sm text-profit">{message}</p> : null}
      <Panel title="Orders">
        <table className="text-sm">
          <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th><th>Fill</th><th></th></tr></thead>
          <tbody>
            {data.orders.length === 0 ? <tr><td className="text-muted" colSpan={8}>No orders in this practice period.</td></tr> : null}
            {data.orders.map((order) => (
              <tr key={order.id}>
                <td className="whitespace-nowrap text-muted">{new Date(order.submittedAt).toLocaleString("en-IN")}</td>
                <td className="font-medium"><Link href={`/terminal?symbol=${order.symbol}`}>{order.symbol}</Link></td>
                <td className={order.side === "BUY" ? "text-profit" : "text-loss"}>{order.side}</td>
                <td>{order.type}</td>
                <td className="font-mono">{order.filledQuantity}/{order.quantity}</td>
                <td>{order.status}{order.reason ? ` · ${order.reason}` : ""}</td>
                <td className="font-mono">{order.avgFill ? `₹${order.avgFill}` : "—"}</td>
                <td>{order.status === "OPEN" ? <button className="text-sm text-primary" onClick={() => api(`/api/orders/${order.id}/cancel`, {}).then(() => { setMessage("Order cancelled."); load(); }).catch((caught) => setError(caught.message))}>Cancel</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Executions">
        <table className="text-sm">
          <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Charges</th><th>Realized</th><th>Data</th></tr></thead>
          <tbody>
            {data.executions.length === 0 ? <tr><td className="text-muted" colSpan={8}>No fills yet.</td></tr> : null}
            {data.executions.map((fill) => (
              <tr key={fill.id}>
                <td className="text-muted">{new Date(fill.executedAt).toLocaleString("en-IN")}</td>
                <td className="font-medium"><Link href={`/terminal?symbol=${fill.symbol}`}>{fill.symbol}</Link></td><td>{fill.side}</td><td className="font-mono">{fill.quantity}</td>
                <td className="font-mono">₹{fill.price}</td>
                <td className="font-mono">₹{fill.charges}</td>
                <td className="font-mono">₹{fill.realized}</td>
                <td>{fill.mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Ledger">
        <table className="text-sm">
          <thead><tr><th>Time</th><th>Type</th><th>Cash change</th><th>Reason</th></tr></thead>
          <tbody>
            {data.ledger.length === 0 ? <tr><td className="text-muted" colSpan={4}>No ledger rows yet.</td></tr> : null}
            {data.ledger.map((entry) => (
              <tr key={entry.id}>
                <td className="text-muted">{new Date(entry.createdAt).toLocaleString("en-IN")}</td>
                <td>{entry.type}</td>
                <td className="font-mono">₹{entry.cashDelta}</td>
                <td>{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageFrame>
  );
}
