"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/api";

type Instrument = { symbol: string; name: string; exchange: string; sector: string };

export default function ScreenerPage() {
  const [rows, setRows] = useState<Instrument[]>([]);
  const [sector, setSector] = useState("All");
  const [error, setError] = useState("");
  useEffect(() => {
    api<Instrument[]>("/api/instruments").then(setRows).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load instruments."));
  }, []);
  const sectors = ["All", ...new Set(rows.map((row) => row.sector))];
  const visible = rows.filter((row) => sector === "All" || row.sector === sector);
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold">Screener</h1>
      <p className="mt-1 text-sm text-muted">Filter the practice catalogue by sector. This list does not rank stocks or invent prices.</p>
      {error ? <p className="mt-3 text-sm text-loss">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-1">
        {sectors.map((item) => (
          <button key={item} onClick={() => setSector(item)} className={`px-2 py-1 text-xs ${sector === item ? "bg-primary text-white" : "bg-panel text-muted"}`}>{item}</button>
        ))}
      </div>
      <div className="mt-4 overflow-hidden border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Symbol</th><th>Name</th><th>Exchange</th><th>Sector</th><th></th></tr></thead>
          <tbody>
            {visible.length === 0 ? <tr><td colSpan={5} className="text-muted">No instruments in this sector.</td></tr> : null}
            {visible.map((row) => (
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
