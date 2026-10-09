"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResetForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    const response = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.get("token"), password }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Reset failed.");
    else setMessage("Password updated. You can sign in.");
  }
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-panel p-6">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      {message ? <p className="mt-4 text-sm text-profit">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-loss">{error}</p> : null}
      <input name="password" type="password" minLength={10} required className="mt-4 w-full rounded border border-border bg-elevated px-3 py-2" />
      <button className="mt-4 rounded bg-primary px-3 py-2 text-white">Update password</button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
