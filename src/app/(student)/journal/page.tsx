"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { api } from "@/components/api";
import { PageFrame } from "@/components/page-frame";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3 block text-[11px] uppercase tracking-[0.12em] text-muted">
      {label}
      <span className="mt-1 block normal-case tracking-normal">{children}</span>
    </label>
  );
}

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
    <PageFrame kicker="Record" title="Journal" lede="Write the reason, the exit, and the lesson before the next simulated trade.">
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <form onSubmit={onSubmit} className="h-fit rounded-lg border border-border bg-panel p-4">
          {message ? <p className="mb-3 text-sm text-profit">{message}</p> : null}
          {error ? <p className="mb-3 text-sm text-loss">{error}</p> : null}
          <Field label="Why this trade"><textarea name="thesis" required className="h-24 w-full px-3 py-2 text-sm" /></Field>
          <Field label="Expected move"><input name="expectedMove" className="w-full px-3 py-2 text-sm" /></Field>
          <Field label="Planned exit"><input name="plannedExit" className="w-full px-3 py-2 text-sm" /></Field>
          <Field label="Risk / reward"><input name="riskReward" placeholder="2" className="w-full px-3 py-2 text-sm" /></Field>
          <Field label="Emotion">
            <select name="emotion" className="w-full px-3 py-2 text-sm">
              {["NEUTRAL", "CALM", "CONFIDENT", "ANXIOUS", "FEARFUL", "GREEDY", "FRUSTRATED"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Mistake tag"><input name="mistakeTag" className="w-full px-3 py-2 text-sm" /></Field>
          <Field label="Lesson learned"><textarea name="lesson" className="h-20 w-full px-3 py-2 text-sm" /></Field>
          <button className="mt-4 bg-primary px-4 py-2 text-sm text-white">Save entry</button>
        </form>
        <div className="space-y-3">
          {rows.length === 0 ? <p className="rounded-lg border border-border bg-panel px-4 py-6 text-sm text-muted">No journal entries yet.</p> : null}
          {rows.map((row) => (
            <article key={row.id} className="rounded-lg border border-border bg-panel p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{new Date(row.createdAt).toLocaleString("en-IN")} {row.symbol ? `· ${row.symbol}` : ""} · {row.emotion}</p>
              <p className="mt-2 leading-6">{row.thesis}</p>
              <p className="mt-2 text-sm text-muted">Exit plan: {row.plannedExit || "—"} · R/R {row.riskReward || "—"} · {row.mistakeTag || "No mistake tag"}</p>
              {row.lesson ? <p className="mt-2 text-sm">{row.lesson}</p> : null}
              {row.feedback.map((item) => <p key={item.body} className="mt-3 rounded-md bg-panel px-3 py-2 text-sm text-[#2962ff]">Feedback from {item.author}: {item.body}</p>)}
            </article>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}
