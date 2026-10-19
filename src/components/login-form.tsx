"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/api";
import { applyTheme, THEME_KEY } from "@/lib/theme";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [mfa, setMfa] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = "obsidian";
    return () => {
      applyTheme(localStorage.getItem(THEME_KEY) || "obsidian");
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      if (mfa) {
        const result = await api<{ role: string }>("/api/auth/login", { challengeToken: mfa, code: String(form.get("code")) });
        router.push(result.role === "STUDENT" ? "/dashboard" : "/admin");
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
      router.push(result.role === "STUDENT" ? "/dashboard" : "/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 w-full max-w-md rounded-xl border border-border bg-panel p-7">
      <p className="text-xs uppercase tracking-[0.28em] text-primary">TradeLab</p>
      <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm italic text-muted">“An investment in knowledge pays the best interest.”</p>
      <p className="mt-1 text-xs text-muted">Benjamin Franklin</p>
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
      <button disabled={pending} className="mt-5 w-full bg-primary px-3 py-2.5 font-medium text-on-primary disabled:opacity-60">{pending ? "Checking…" : "Continue"}</button>
      <a className="mt-4 block text-sm text-muted" href="/forgot-password">Forgot password</a>
    </form>
  );
}
