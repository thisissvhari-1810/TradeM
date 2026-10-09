"use client";

import { FormEvent, useState } from "react";
import { api } from "@/components/api";

export default function ForgotPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ message: string }>("/api/auth/password", { email: String(form.get("email")) });
      setMessage(result.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    }
  }
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <form onSubmit={onSubmit} className="rounded-xl border border-border bg-panel p-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-muted">If email delivery is not configured, a development server prints the link in its logs. Production does not reveal whether the account exists.</p>
        {message ? <p className="mt-4 text-sm text-profit">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-loss">{error}</p> : null}
        <input name="email" type="email" required className="mt-4 w-full rounded border border-border bg-elevated px-3 py-2" placeholder="Email" />
        <button className="mt-4 rounded bg-primary px-3 py-2 text-white">Send reset link</button>
      </form>
    </main>
  );
}
