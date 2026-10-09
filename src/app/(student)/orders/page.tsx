"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/api";

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
  if (error) return <p className="text-loss">{error}</p>;
  if (!data) return <p className="text-muted">Loading orders…</p>;
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Orders and ledger</h1>
      {message ? <p className="text-sm text-profit">{message}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th><th>Fill</th><th></th></tr></thead>
          <tbody>
            {data.orders.length === 0 ? <tr><td className="p-3 text-muted" colSpan={8}>No orders in this practice period.</td></tr> : null}
            {data.orders.map((order) => (
              <tr key={order.id} className="border-t border-border">
                <td className="p-3 whitespace-nowrap">{new Date(order.submittedAt).toLocaleString("en-IN")}</td>
                <td>{order.symbol}</td>
                <td>{order.side}</td>
                <td>{order.type}</td>
                <td>{order.filledQuantity}/{order.quantity}</td>
                <td>{order.status}{order.reason ? ` · ${order.reason}` : ""}</td>
                <td className="font-mono">{order.avgFill ? `₹${order.avgFill}` : "—"}</td>
                <td>{order.status === "OPEN" ? <button className="text-primary" onClick={() => api(`/api/orders/${order.id}/cancel`, {}).then(() => { setMessage("Order cancelled."); load(); }).catch((caught) => setError(caught.message))}>Cancel</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="font-medium">Executions</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Charges</th><th>Realized</th><th>Data</th></tr></thead>
          <tbody>
            {data.executions.length === 0 ? <tr><td className="p-3 text-muted" colSpan={8}>No fills yet.</td></tr> : null}
            {data.executions.map((fill) => (
              <tr key={fill.id} className="border-t border-border">
                <td className="p-3">{new Date(fill.executedAt).toLocaleString("en-IN")}</td>
                <td>{fill.symbol}</td><td>{fill.side}</td><td>{fill.quantity}</td>
                <td className="font-mono">₹{fill.price}</td>
                <td className="font-mono">₹{fill.charges}</td>
                <td className="font-mono">₹{fill.realized}</td>
                <td>{fill.mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="font-medium">Ledger</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Time</th><th>Type</th><th>Cash change</th><th>Reason</th></tr></thead>
          <tbody>
            {data.ledger.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="p-3">{new Date(entry.createdAt).toLocaleString("en-IN")}</td>
                <td>{entry.type}</td>
                <td className="font-mono">₹{entry.cashDelta}</td>
                <td>{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
