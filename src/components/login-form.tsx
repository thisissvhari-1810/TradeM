"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [mfa, setMfa] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      if (mfa) {
        const result = await api<{ role: string }>("/api/auth/login", { challengeToken: mfa, code: String(form.get("code")) });
        router.push(result.role === "STUDENT" ? "/terminal" : "/admin");
        router.refresh();
        return;
      }
      const result = await api<{ mfaRequired?: boolean; challengeToken?: string; role?: string }>("/api/auth/login", {
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (result.mfaRequired && result.challengeToken) {
        setMfa(result.challengeToken);
        return;
      }
      router.push(result.role === "STUDENT" ? "/terminal" : "/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 w-full max-w-md rounded-xl border border-border bg-panel p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Paper trading only. This account cannot place a real order.</p>
      {error ? <p className="mt-4 rounded border border-loss/40 bg-loss/10 px-3 py-2 text-sm">{error}</p> : null}
      {mfa ? (
        <label className="mt-4 block text-sm">
          Authentication code
          <input name="code" inputMode="numeric" autoComplete="one-time-code" className="mt-1 w-full rounded border border-border bg-elevated px-3 py-2" required />
        </label>
      ) : (
        <>
          <label className="mt-4 block text-sm">Email<input name="email" type="email" className="mt-1 w-full rounded border border-border bg-elevated px-3 py-2" required /></label>
          <label className="mt-3 block text-sm">Password<input name="password" type="password" className="mt-1 w-full rounded border border-border bg-elevated px-3 py-2" required /></label>
        </>
      )}
      <button disabled={pending} className="mt-5 w-full rounded bg-primary px-3 py-2 font-medium text-white disabled:opacity-60">{pending ? "Checking…" : "Continue"}</button>
      <a className="mt-4 block text-sm text-muted" href="/forgot-password">Forgot password</a>
    </form>
  );
}
