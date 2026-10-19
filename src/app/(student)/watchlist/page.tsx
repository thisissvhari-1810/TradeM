"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/components/api";

type Item = { symbol: string; name: string; exchange?: string };

export default function WatchlistPage() {
  const [rows, setRows] = useState<Item[]>([]);
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState("");
  function load() {
    api<Item[]>("/api/workspace?view=watchlist").then(setRows).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the watchlist."));
  }
  useEffect(load, []);
  async function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/workspace", { action: "watchlist", symbol });
      setSymbol("");
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that symbol.");
    }
  }
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Watchlist</h1>
      <p className="mt-1 text-sm text-muted">Saved on your account. Prices are shown on the chart after you open a symbol.</p>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="Symbol" aria-label="Symbol to add" className="h-9 flex-1 px-3 text-sm" />
        <button className="bg-primary px-3 text-sm text-white">Add</button>
      </form>
      {error ? <p className="mt-3 text-sm text-loss">{error}</p> : null}
      <div className="mt-4 overflow-hidden border border-border bg-panel">
        {rows.length === 0 ? <p className="px-4 py-6 text-sm text-muted">No symbols yet. Add one from the practice catalogue.</p> : null}
        {rows.map((row) => (
          <div key={row.symbol} className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <Link href={`/terminal?symbol=${row.symbol}`}><b>{row.symbol}</b> <span className="text-muted">{row.name}</span></Link>
            <button className="text-muted" onClick={() => api("/api/workspace", { action: "watchlist", symbol: row.symbol, remove: true }).then(load).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not remove it."))}>Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}
