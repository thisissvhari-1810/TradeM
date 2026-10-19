"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/api";

type Instrument = { symbol: string; name: string; exchange: string; sector: string };

export default function MarketsPage() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Instrument[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Instrument[]>(`/api/instruments?q=${encodeURIComponent(query)}`).then(setRows).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load instruments."));
  }, [query]);
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold">Markets</h1>
      <p className="mt-1 text-sm text-muted">Search an NSE stock by symbol or company name. Opening one loads its chart.</p>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol or company" aria-label="Search markets" className="mt-4 h-9 w-full max-w-md px-3 text-sm" />
      {error ? <p className="mt-3 text-sm text-loss">{error}</p> : null}
      <div className="mt-4 overflow-hidden border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Symbol</th><th>Name</th><th>Exchange</th><th>Sector</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={5} className="text-muted">No instruments match.</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.symbol}>
                <td className="font-semibold"><Link href={`/terminal?symbol=${row.symbol}`}>{row.symbol}</Link></td>
                <td>{row.name}</td>
                <td>{row.exchange}</td>
                <td className="text-muted">{row.sector}</td>
                <td><Link className="text-primary" href={`/terminal?symbol=${row.symbol}`}>Chart</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
