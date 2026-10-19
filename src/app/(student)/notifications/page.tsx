"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/api";

type Note = { id: string; title: string; body: string; href: string; read: boolean; createdAt: string };

export default function NotificationsPage() {
  const [rows, setRows] = useState<Note[]>([]);
  const [error, setError] = useState("");
  function load() {
    api<Note[]>("/api/workspace?view=notifications").then(setRows).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load notifications."));
  }
  useEffect(load, []);
  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <button className="text-sm text-primary" onClick={() => api("/api/workspace", { action: "notification-read" }).then(load)}>Mark all read</button>
      </div>
      <p className="mt-1 text-sm text-muted">These are records created by the app, such as a price alert that the reference quote has crossed.</p>
      {error ? <p className="mt-3 text-sm text-loss">{error}</p> : null}
      {rows.length === 0 ? <p className="mt-4 border border-border bg-panel px-4 py-6 text-sm text-muted">No notifications yet.</p> : null}
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="border border-border bg-panel px-4 py-3 text-sm">
            <p className="font-semibold">{row.title} {row.read ? <span className="text-xs text-muted">Read</span> : <span className="text-xs text-primary">Unread</span>}</p>
            <p className="mt-1 text-muted">{row.body}</p>
            <p className="mt-1 text-xs text-muted">{new Date(row.createdAt).toLocaleString("en-IN")}</p>
            <div className="mt-2 flex gap-3">
              {row.href ? <Link className="text-primary" href={row.href}>Open</Link> : null}
              {!row.read ? <button className="text-primary" onClick={() => api("/api/workspace", { action: "notification-read", id: row.id }).then(load)}>Mark read</button> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
