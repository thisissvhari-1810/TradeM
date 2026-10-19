"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/api";
import { PageFrame } from "@/components/page-frame";

type Competition = { id: string; title: string; description: string; status: string; className: string; startsAt: string; endsAt: string; weights: { return: number; drawdown: number; learning: number }; joined: boolean; leaderboard: Array<{ rank: number | null; name: string; you: boolean; returnPercent: string; drawdownPercent: string; learningPercent: string; score: number | string; status: string }> };

export default function CompetitionsPage() {
  const [rows, setRows] = useState<Competition[]>([]);
  const [error, setError] = useState("");
  function load() {
    api<Competition[]>("/api/workspace?view=competitions").then(setRows).catch((caught) => setError(caught.message));
  }
  useEffect(load, []);
  if (error) return <p className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>;
  return (
    <PageFrame kicker="Class" title="Competitions" lede="Rankings use a weighted score of percentage return, maximum drawdown, and learning completion. Administrator cash adjustments are removed from the return. Resetting a practice account freezes that competition entry.">
      {rows.length === 0 ? <p className="rounded-lg border border-border bg-panel px-4 py-6 text-sm text-muted">No competitions yet.</p> : null}
      {rows.map((row) => (
        <article key={row.id} className="overflow-hidden rounded-lg border border-border bg-panel">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4">
            <div>
              <h2 className="text-lg font-semibold">{row.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{row.description}</p>
              <p className="mt-2 text-xs text-muted">Weights · return {row.weights.return} · drawdown {row.weights.drawdown} · learning {row.weights.learning}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-panel px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-muted">{row.status}</span>
              {row.joined ? <span className="rounded-md bg-profit/15 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-profit">Joined</span> : null}
              {!row.joined && row.status === "ACTIVE" ? <button className="bg-primary px-3 py-1.5 text-sm text-white" onClick={() => api("/api/workspace", { action: "join", competitionId: row.id }).then(load).catch((caught) => setError(caught.message))}>Join</button> : null}
            </div>
          </div>
          <p className="px-4 pt-3 text-xs text-muted">{row.className}</p>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead><tr><th>Rank</th><th>Student</th><th>Return</th><th>Drawdown</th><th>Learning</th><th>Score</th></tr></thead>
              <tbody>
                {row.leaderboard.length === 0 ? <tr><td className="text-muted" colSpan={6}>Ranks appear after scores are refreshed.</td></tr> : null}
                {row.leaderboard.map((entry) => (
                  <tr key={`${entry.rank}-${entry.name}`} className={entry.you ? "bg-[#2962ff]/10" : ""}>
                    <td className="font-mono">{entry.rank ?? "—"}</td>
                    <td className="font-medium">{entry.you ? `${entry.name} (you)` : entry.name}</td>
                    <td className="font-mono">{entry.returnPercent}</td>
                    <td className="font-mono">{entry.drawdownPercent}</td>
                    <td className="font-mono">{entry.learningPercent}</td>
                    <td className="font-mono">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </PageFrame>
  );
}
