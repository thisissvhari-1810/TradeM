"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/components/api";

type Journal = { id: string; thesis: string; expectedMove: string; plannedExit: string; riskReward: string; emotion: string; lesson: string; mistakeTag: string; createdAt: string; symbol: string | null; feedback: Array<{ body: string; author: string }> };

export default function JournalPage() {
  const [rows, setRows] = useState<Journal[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function load() {
    api<Journal[]>("/api/workspace?view=journal").then(setRows).catch((caught) => setError(caught.message));
  }
  useEffect(load, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/workspace", {
        action: "journal",
        thesis: String(form.get("thesis")),
        expectedMove: String(form.get("expectedMove")),
        plannedExit: String(form.get("plannedExit")),
        riskReward: String(form.get("riskReward")),
        emotion: String(form.get("emotion")),
        lesson: String(form.get("lesson")),
        mistakeTag: String(form.get("mistakeTag")),
      });
      setMessage("Journal entry saved.");
      event.currentTarget.reset();
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    }
  }
  return (
    <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form onSubmit={onSubmit} className="rounded-xl border border-border bg-panel p-4">
        <h1 className="text-xl font-semibold">Trading journal</h1>
        {message ? <p className="mt-2 text-sm text-profit">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-loss">{error}</p> : null}
        <textarea name="thesis" required placeholder="Why this trade" className="mt-3 h-24 w-full rounded border border-border bg-elevated p-2 text-sm" />
        <input name="expectedMove" placeholder="Expected move" className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" />
        <input name="plannedExit" placeholder="Planned exit" className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" />
        <input name="riskReward" placeholder="Risk/reward, for example 2" className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" />
        <select name="emotion" className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2 text-sm">
          {["NEUTRAL", "CALM", "CONFIDENT", "ANXIOUS", "FEARFUL", "GREEDY", "FRUSTRATED"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input name="mistakeTag" placeholder="Mistake tag, if any" className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2 text-sm" />
        <textarea name="lesson" placeholder="Lesson learned" className="mt-2 h-20 w-full rounded border border-border bg-elevated p-2 text-sm" />
        <button className="mt-3 rounded bg-primary px-3 py-2 text-sm text-white">Save entry</button>
      </form>
      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted">No journal entries yet.</p> : null}
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-border bg-panel p-4">
            <p className="text-xs text-muted">{new Date(row.createdAt).toLocaleString("en-IN")} {row.symbol ? `· ${row.symbol}` : ""} · {row.emotion}</p>
            <p className="mt-2">{row.thesis}</p>
            <p className="mt-2 text-sm text-muted">Exit plan: {row.plannedExit || "—"} · R/R {row.riskReward || "—"} · {row.mistakeTag || "No mistake tag"}</p>
            <p className="mt-2 text-sm">{row.lesson}</p>
            {row.feedback.map((item) => <p key={item.body} className="mt-2 text-sm text-primary">Feedback from {item.author}: {item.body}</p>)}
          </article>
        ))}
      </div>
    </section>
  );
}
