"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/api";

type Competition = { id: string; title: string; description: string; status: string; className: string; startsAt: string; endsAt: string; weights: { return: number; drawdown: number; learning: number }; joined: boolean; leaderboard: Array<{ rank: number | null; name: string; you: boolean; returnPercent: string; drawdownPercent: string; learningPercent: string; score: number | string; status: string }> };

export default function CompetitionsPage() {
  const [rows, setRows] = useState<Competition[]>([]);
  const [error, setError] = useState("");
  function load() {
    api<Competition[]>("/api/workspace?view=competitions").then(setRows).catch((caught) => setError(caught.message));
  }
  useEffect(load, []);
  if (error) return <p className="text-loss">{error}</p>;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Competitions</h1>
      <p className="max-w-3xl text-sm text-muted">Rankings use a weighted score of percentage return, maximum drawdown, and learning completion. Administrator cash adjustments are removed from the return. Resetting a practice account freezes that competition entry.</p>
      {rows.length === 0 ? <p className="text-sm text-muted">No competitions yet.</p> : null}
      {rows.map((row) => (
        <article key={row.id} className="rounded-xl border border-border bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">{row.title}</h2>
            <span className="text-xs text-muted">{row.status} · {row.className}</span>
          </div>
          <p className="mt-2 text-sm text-muted">{row.description}</p>
          <p className="mt-2 text-xs text-muted">Weights return {row.weights.return} / drawdown {row.weights.drawdown} / learning {row.weights.learning}</p>
          {!row.joined && row.status === "ACTIVE" ? <button className="mt-3 rounded bg-primary px-3 py-1.5 text-sm text-white" onClick={() => api("/api/workspace", { action: "join", competitionId: row.id }).then(load).catch((caught) => setError(caught.message))}>Join</button> : null}
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-muted"><tr><th>Rank</th><th>Student</th><th>Return</th><th>Drawdown</th><th>Learning</th><th>Score</th></tr></thead>
            <tbody>
              {row.leaderboard.length === 0 ? <tr><td className="py-2 text-muted" colSpan={6}>Ranks appear after scores are refreshed.</td></tr> : null}
              {row.leaderboard.map((entry) => (
                <tr key={`${entry.rank}-${entry.name}`} className="border-t border-border"><td>{entry.rank}</td><td>{entry.you ? `${entry.name} (you)` : entry.name}</td><td>{entry.returnPercent}</td><td>{entry.drawdownPercent}</td><td>{entry.learningPercent}</td><td>{entry.score}</td></tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </section>
  );
}
