"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/components/api";

export default function SetupPage() {
  const [required, setRequired] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ setupRequired: boolean }>("/api/setup").then((result) => setRequired(result.setupRequired)).catch((caught) => setError(caught.message));
  }, []);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/setup", { setupToken: String(form.get("setupToken")), name: String(form.get("name")), email: String(form.get("email")), password: String(form.get("password")) });
      setMessage("Super admin created. Sign in, then remove the bootstrap password from the environment.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed.");
    }
  }
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={onSubmit} className="rounded-xl border border-border bg-panel p-6">
        <h1 className="text-2xl font-semibold">Create the first admin</h1>
        <p className="mt-2 text-sm text-muted">This page works only while no super admin exists. The setup token comes from the SETUP_TOKEN environment variable.</p>
        {required === false ? <p className="mt-4 text-sm">An administrator already exists.</p> : null}
        {message ? <p className="mt-4 text-sm text-profit">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-loss">{error}</p> : null}
        <input name="setupToken" required className="mt-4 w-full rounded border border-border bg-elevated px-3 py-2" placeholder="Setup token" />
        <input name="name" required className="mt-3 w-full rounded border border-border bg-elevated px-3 py-2" placeholder="Name" />
        <input name="email" type="email" required className="mt-3 w-full rounded border border-border bg-elevated px-3 py-2" placeholder="Email" />
        <input name="password" type="password" required className="mt-3 w-full rounded border border-border bg-elevated px-3 py-2" placeholder="Password" />
        <button className="mt-4 rounded bg-primary px-3 py-2 text-white">Create admin</button>
      </form>
    </main>
  );
}
