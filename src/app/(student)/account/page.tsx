"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/components/api";

export default function AccountPage() {
  const [account, setAccount] = useState<{ email: string; role: string; mfaEnabled: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enrol, setEnrol] = useState<{ secret: string; uri: string } | null>(null);
  useEffect(() => {
    api<{ email: string; role: string; mfaEnabled: boolean }>("/api/auth/account").then(setAccount).catch((caught) => setError(caught.message));
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
    <section className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Account</h1>
      {account ? <p className="text-sm text-muted">{account.email} · {account.role}</p> : null}
      {message ? <p className="text-sm text-profit">{message}</p> : null}
      {error ? <p className="text-sm text-loss">{error}</p> : null}
      <form onSubmit={changePassword} className="rounded-xl border border-border bg-panel p-4">
        <h2 className="font-medium">Change password</h2>
        <input name="currentPassword" type="password" required className="mt-3 w-full rounded border border-border bg-elevated px-2 py-2" placeholder="Current password" />
        <input name="newPassword" type="password" required minLength={10} className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2" placeholder="New password" />
        <button className="mt-3 rounded bg-primary px-3 py-2 text-sm text-white">Update</button>
      </form>
      {account && account.role !== "STUDENT" ? (
        <form
          className="rounded-xl border border-border bg-panel p-4 text-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const code = String(new FormData(event.currentTarget).get("code"));
            api("/api/auth/account", { enable: true, code, secret: enrol?.secret }).then(() => setMessage("Authenticator enabled.")).catch((caught) => setError(caught.message));
          }}
        >
          <h2 className="font-medium">Authenticator</h2>
          <button type="button" className="mt-3 text-primary" onClick={() => api<{ secret: string; uri: string }>("/api/auth/account", { enable: true }).then(setEnrol).catch((caught) => setError(caught.message))}>Generate secret</button>
          {enrol ? <p className="mt-2 break-all text-xs text-muted">{enrol.uri}</p> : null}
          <input name="code" placeholder="6-digit code" className="mt-2 w-full rounded border border-border bg-elevated px-2 py-2" />
          <button className="mt-3 rounded bg-primary px-3 py-2 text-white">Confirm</button>
        </form>
      ) : null}
    </section>
  );
}
