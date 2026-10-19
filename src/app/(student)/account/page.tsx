"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/components/api";
import { PageFrame } from "@/components/page-frame";
import { ThemePicker } from "@/components/theme-picker";

export default function AccountPage() {
  const [account, setAccount] = useState<{ name: string; email: string; role: string; status: string; tradingEnabled: boolean; mfaEnabled: boolean } | null>(null);
  const [book, setBook] = useState<{ startingCapital: string; cashAvailable: string; cashReserved: string; equity: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enrol, setEnrol] = useState<{ secret: string; uri: string } | null>(null);
  useEffect(() => {
    api<{ name: string; email: string; role: string; status: string; tradingEnabled: boolean; mfaEnabled: boolean }>("/api/auth/account").then(setAccount).catch((caught) => setError(caught.message));
    api<{ startingCapital: string; cashAvailable: string; cashReserved: string; equity: string }>("/api/portfolio").then(setBook).catch(() => setBook(null));
  }, []);
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/account", { currentPassword: String(form.get("currentPassword")), newPassword: String(form.get("newPassword")) });
      setMessage("Password changed. Sign in again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change password.");
    }
  }
  return (
    <PageFrame kicker="Settings" title="Settings" lede="Profile, virtual capital, colour theme, and password. Obsidian gold is the default. Capital changes are made by an administrator.">
      <div className="border border-border bg-panel p-4"><ThemePicker /></div>
      {account ? (
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Name", account.name],
            ["Email", account.email],
            ["Role", account.role.replaceAll("_", " ")],
            ["Status", `${account.status}${account.tradingEnabled ? " · trading on" : " · trading off"}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-panel px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {book ? (
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Initial capital", book.startingCapital],
            ["Buying power", book.cashAvailable],
            ["Reserved", book.cashReserved],
            ["Equity", book.equity],
          ].map(([label, value]) => (
            <div key={label} className="bg-panel px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-1 font-mono text-sm">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {message ? <p className="rounded-lg border border-profit/40 bg-profit/10 px-4 py-3 text-sm text-profit">{message}</p> : null}
      {error ? <p className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p> : null}
      <form onSubmit={changePassword} className="max-w-xl rounded-lg border border-border bg-panel p-4">
        <h2 className="text-sm font-semibold">Change password</h2>
        <label className="mt-4 block text-[11px] uppercase tracking-[0.12em] text-muted">Current password
          <input name="currentPassword" type="password" required className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal" />
        </label>
        <label className="mt-3 block text-[11px] uppercase tracking-[0.12em] text-muted">New password
          <input name="newPassword" type="password" required minLength={10} className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal" />
        </label>
        <button className="mt-4 bg-primary px-4 py-2 text-sm text-white">Update password</button>
      </form>
      {account && account.role !== "STUDENT" ? (
        <form
          className="max-w-xl rounded-lg border border-border bg-panel p-4 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const code = String(new FormData(event.currentTarget).get("code"));
            api("/api/auth/account", { enable: true, code, secret: enrol?.secret }).then(() => setMessage("Authenticator enabled.")).catch((caught) => setError(caught.message));
          }}
        >
          <h2 className="text-sm font-semibold">Authenticator</h2>
          <button type="button" className="mt-3 text-primary" onClick={() => api<{ secret: string; uri: string }>("/api/auth/account", { enable: true }).then(setEnrol).catch((caught) => setError(caught.message))}>Generate secret</button>
          {enrol ? <p className="mt-2 break-all text-xs text-muted">{enrol.uri}</p> : null}
          <label className="mt-3 block text-[11px] uppercase tracking-[0.12em] text-muted">6-digit code
            <input name="code" className="mt-1 w-full px-3 py-2 text-sm normal-case tracking-normal" />
          </label>
          <button className="mt-4 bg-primary px-4 py-2 text-white">Confirm</button>
        </form>
      ) : null}
    </PageFrame>
  );
}
