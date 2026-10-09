"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/components/api";

type View = "overview" | "users" | "classes" | "orders" | "learning" | "competitions" | "reports" | "market" | "trading" | "audit" | "health";

export function AdminScreen({ view }: { view: View }) {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (view === "learning" || view === "competitions" || view === "reports") return;
    const remote = view === "market" || view === "trading" ? "settings" : view === "overview" ? "" : view;
    const path = remote ? `/api/admin?view=${remote}${view === "users" ? `&q=${encodeURIComponent(query)}&page=${page}` : ""}` : "/api/admin";
    let ignore = false;
    api(path).then((result) => { if (!ignore) setData(result); }).catch((caught) => { if (!ignore) setError(caught instanceof Error ? caught.message : "Request failed."); });
    return () => { ignore = true; };
  }, [view, query, page]);

  async function send(body: Record<string, unknown>) {
    setError("");
    setMessage("");
    try {
      await api("/api/admin", body);
      setMessage("Saved.");
      if (view !== "learning" && view !== "competitions" && view !== "reports") {
        const remote = view === "market" || view === "trading" ? "settings" : view === "overview" ? "" : view;
        const path = remote ? `/api/admin?view=${remote}` : "/api/admin";
        setData(await api(path));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold capitalize">{view === "overview" ? "Administration" : view}</h1>
      {message ? <p className="text-sm text-profit">{message}</p> : null}
      {error ? <p className="text-sm text-loss">{error}</p> : null}
      {data == null && !error ? <p className="text-sm text-muted">Loading…</p> : null}
      {view === "overview" && data ? <Overview data={data as { students: number; orders: number; openOrders: number; provider: string }} /> : null}
      {view === "users" ? <Users data={data as UserPage | null} query={query} setQuery={setQuery} page={page} setPage={setPage} send={send} /> : null}
      {view === "classes" ? <Classes rows={(data as ClassRow[] | null) ?? []} send={send} /> : null}
      {view === "orders" ? <Orders rows={(data as OrderRow[] | null) ?? []} /> : null}
      {view === "learning" ? <Learning send={send} /> : null}
      {view === "competitions" ? <Competitions send={send} /> : null}
      {view === "reports" ? <Reports /> : null}
      {view === "market" || view === "trading" ? <Settings view={view} data={data} send={send} /> : null}
      {view === "audit" ? <Audit rows={(data as AuditRow[] | null) ?? []} /> : null}
      {view === "health" ? <Health data={data} /> : null}
    </section>
  );
}

function Overview({ data }: { data: { students: number; orders: number; openOrders: number; provider: string } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {[
        ["Students", String(data.students)],
        ["Orders", String(data.orders)],
        ["Open orders", String(data.openOrders)],
        ["Market provider", data.provider],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-panel p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-mono">{value}</p></div>
      ))}
    </div>
  );
}

type UserRow = { id: string; name: string; email: string; role: string; status: string; tradingEnabled: boolean; cashAvailable: string | null; period: string | null };
type UserPage = { users: UserRow[]; total: number; page: number };

function Users({ data, query, setQuery, page, setPage, send }: { data: UserPage | null; query: string; setQuery: (value: string) => void; page: number; setPage: (value: number) => void; send: (body: Record<string, unknown>) => Promise<void> }) {
  return (
    <div className="space-y-4">
      <form className="grid gap-2 rounded-xl border border-border bg-panel p-4 md:grid-cols-3" onSubmit={(event) => submitUser(event, send)}>
        <input name="name" required placeholder="Name" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="email" type="email" required placeholder="Email" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="password" type="password" required placeholder="Temporary password" className="rounded border border-border bg-elevated px-2 py-2" />
        <select name="role" className="rounded border border-border bg-elevated px-2 py-2"><option>STUDENT</option><option>INSTRUCTOR</option><option>SUPER_ADMIN</option></select>
        <input name="startingRupees" placeholder="Starting ₹ for students" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="classId" placeholder="Class id (optional)" className="rounded border border-border bg-elevated px-2 py-2" />
        <button className="rounded bg-primary px-3 py-2 text-white">Create account</button>
      </form>
      <div className="flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="rounded border border-border bg-panel px-3 py-2" />
        <button className="rounded border border-border px-3" onClick={() => setPage(Math.max(1, page - 1))}>Previous</button>
        <button className="rounded border border-border px-3" onClick={() => setPage(page + 1)}>Next</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Cash</th><th>Actions</th></tr></thead>
          <tbody>
            {data?.users?.length ? null : <tr><td className="p-3 text-muted" colSpan={6}>No matching users.</td></tr>}
            {data?.users.map((user) => (
              <tr key={user.id} className="border-t border-border align-top">
                <td className="p-3">{user.name}<div className="text-xs text-muted">{user.period}</div></td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.status}{user.tradingEnabled ? "" : " · trading off"}</td>
                <td className="font-mono">{user.cashAvailable ? `₹${user.cashAvailable}` : "—"}</td>
                <td className="space-y-2 p-3">
                  <button className="block text-primary" onClick={() => confirmSend(send, { action: "access", userId: user.id, status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE", tradingEnabled: user.status !== "ACTIVE", reason: "Access change from admin console." })}>{user.status === "ACTIVE" ? "Suspend" : "Reactivate"}</button>
                  <button className="block text-primary" onClick={() => confirmSend(send, { action: "access", userId: user.id, tradingEnabled: !user.tradingEnabled, reason: "Trading access change from admin console." })}>{user.tradingEnabled ? "Disable trading" : "Enable trading"}</button>
                  <button className="block text-primary" onClick={() => fund(send, user.id, "credit")}>Credit</button>
                  <button className="block text-primary" onClick={() => fund(send, user.id, "debit")}>Debit</button>
                  <button className="block text-loss" onClick={() => confirmSend(send, { action: "reset", userId: user.id, reason: window.prompt("Reason for resetting this practice period") ?? "" })}>Reset period</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{data ? `${data.total} users` : ""} Passwords and hashes are never shown.</p>
    </div>
  );
}

function submitUser(event: FormEvent<HTMLFormElement>, send: (body: Record<string, unknown>) => Promise<void>) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!window.confirm("Create this account with virtual funds?")) return;
  void send({ action: "create-user", name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role"), startingRupees: form.get("startingRupees") || undefined, classId: form.get("classId") || undefined });
}

function fund(send: (body: Record<string, unknown>) => Promise<void>, userId: string, direction: "credit" | "debit") {
  const amountRupees = window.prompt(direction === "credit" ? "Rupees to credit" : "Rupees to debit");
  const reason = window.prompt("Reason");
  if (!amountRupees || !reason) return;
  if (!window.confirm(`${direction} ₹${amountRupees}? This writes a ledger entry.`)) return;
  void send({ action: "funds", userId, direction, amountRupees, reason });
}

function confirmSend(send: (body: Record<string, unknown>) => Promise<void>, body: Record<string, unknown>) {
  if (!body.reason) return;
  if (!window.confirm("Confirm this account change?")) return;
  void send(body);
}

type ClassRow = { id: string; name: string; description: string; instructor: string; students: number };
function Classes({ rows, send }: { rows: ClassRow[]; send: (body: Record<string, unknown>) => Promise<void> }) {
  return (
    <div className="space-y-4">
      <form className="grid gap-2 rounded-xl border border-border bg-panel p-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void send({ action: "class", name: form.get("name"), description: form.get("description"), instructorId: form.get("instructorId") }); }}>
        <input name="name" required placeholder="Class name" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="description" placeholder="Description" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="instructorId" placeholder="Instructor user id" className="rounded border border-border bg-elevated px-2 py-2" />
        <button className="rounded bg-primary px-3 py-2 text-white">Create class</button>
      </form>
      <form className="grid gap-2 rounded-xl border border-border bg-panel p-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void send({ action: "enroll", classId: form.get("classId"), userId: form.get("userId") }); }}>
        <input name="classId" required placeholder="Class id" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="userId" required placeholder="Student user id" className="rounded border border-border bg-elevated px-2 py-2" />
        <button className="rounded bg-primary px-3 py-2 text-white">Enrol student</button>
      </form>
      {rows.map((row) => <div key={row.id} className="rounded-xl border border-border bg-panel p-4 text-sm"><p className="font-medium">{row.name}</p><p className="text-muted">{row.instructor} · {row.students} students · {row.id}</p><p>{row.description}</p></div>)}
      <JournalReview />
    </div>
  );
}

function JournalReview() {
  const [rows, setRows] = useState<Array<{ id: string; student: string; thesis: string; feedback: Array<{ body: string }> }>>([]);
  const [note, setNote] = useState("");
  useEffect(() => {
    api<Array<{ id: string; student: string; thesis: string; feedback: Array<{ body: string }> }>>("/api/workspace")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  if (!rows.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-medium">Journal feedback</h2>
      {note ? <p className="text-sm text-profit">{note}</p> : null}
      {rows.map((row) => (
        <form key={row.id} className="rounded-xl border border-border bg-panel p-4 text-sm" onSubmit={(event) => { event.preventDefault(); const body = String(new FormData(event.currentTarget).get("body")); api("/api/workspace", { action: "feedback", journalId: row.id, body }).then(() => setNote("Feedback saved.")).catch((caught) => setNote(caught.message)); }}>
          <p className="text-muted">{row.student}</p>
          <p className="mt-1">{row.thesis}</p>
          <textarea name="body" required placeholder="Feedback" className="mt-2 w-full rounded border border-border bg-elevated p-2" />
          <button className="mt-2 rounded bg-primary px-3 py-1.5 text-white">Send feedback</button>
        </form>
      ))}
    </div>
  );
}

type OrderRow = { id: string; student: string; email: string; symbol: string; side: string; type: string; quantity: number; status: string; submittedAt: string; reason: string | null };
function Orders({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-panel">
      <table className="w-full text-left text-sm">
        <thead className="text-muted"><tr><th className="p-3">When</th><th>Student</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td className="p-3 text-muted" colSpan={7}>No orders.</td></tr> : null}
          {rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3">{new Date(row.submittedAt).toLocaleString("en-IN")}</td><td>{row.student}</td><td>{row.symbol}</td><td>{row.side}</td><td>{row.type}</td><td>{row.quantity}</td><td>{row.status}{row.reason ? ` · ${row.reason}` : ""}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Learning({ send }: { send: (body: Record<string, unknown>) => Promise<void> }) {
  return (
    <form className="grid gap-2 rounded-xl border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void send({ action: "lesson", title: form.get("title"), summary: form.get("summary"), body: form.get("body"), level: form.get("level"), pathSlug: form.get("pathSlug"), videoUrl: form.get("videoUrl") }); }}>
      <input name="title" required placeholder="Lesson title" className="rounded border border-border bg-elevated px-2 py-2" />
      <input name="pathSlug" required placeholder="Path slug: beginner, intermediate, or advanced" className="rounded border border-border bg-elevated px-2 py-2" />
      <select name="level" className="rounded border border-border bg-elevated px-2 py-2"><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select>
      <input name="summary" required placeholder="Summary" className="rounded border border-border bg-elevated px-2 py-2" />
      <input name="videoUrl" placeholder="https video URL" className="rounded border border-border bg-elevated px-2 py-2" />
      <textarea name="body" required placeholder="Lesson body" className="h-40 rounded border border-border bg-elevated p-2" />
      <button className="rounded bg-primary px-3 py-2 text-white">Publish lesson</button>
    </form>
  );
}

function Competitions({ send }: { send: (body: Record<string, unknown>) => Promise<void> }) {
  return (
    <form className="grid gap-2 rounded-xl border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (!window.confirm("Open this competition?")) return; void send({ action: "competition", title: form.get("title"), description: form.get("description"), classId: form.get("classId") || undefined, startsAt: form.get("startsAt"), endsAt: form.get("endsAt"), returnWeight: Number(form.get("returnWeight")), drawdownWeight: Number(form.get("drawdownWeight")), learningWeight: Number(form.get("learningWeight")) }); }}>
      <input name="title" required placeholder="Title" className="rounded border border-border bg-elevated px-2 py-2" />
      <textarea name="description" placeholder="Description" className="rounded border border-border bg-elevated p-2" />
      <input name="classId" placeholder="Limit to class id, or leave blank" className="rounded border border-border bg-elevated px-2 py-2" />
      <input name="startsAt" type="datetime-local" required className="rounded border border-border bg-elevated px-2 py-2" />
      <input name="endsAt" type="datetime-local" required className="rounded border border-border bg-elevated px-2 py-2" />
      <input name="returnWeight" type="number" defaultValue={50} className="rounded border border-border bg-elevated px-2 py-2" />
      <input name="drawdownWeight" type="number" defaultValue={30} className="rounded border border-border bg-elevated px-2 py-2" />
      <input name="learningWeight" type="number" defaultValue={20} className="rounded border border-border bg-elevated px-2 py-2" />
      <button className="rounded bg-primary px-3 py-2 text-white">Create competition</button>
    </form>
  );
}

function Reports() {
  return (
    <div className="rounded-xl border border-border bg-panel p-4 text-sm">
      <p>Export recent simulated orders as CSV. The file contains names and emails of students, so treat it as personal data.</p>
      <a className="mt-3 inline-block rounded bg-primary px-3 py-2 text-white" href="/api/admin?view=report">Download order report</a>
    </div>
  );
}

function Settings({ view, data, send }: { view: "market" | "trading"; data: unknown; send: (body: Record<string, unknown>) => Promise<void> }) {
  const settings = data as { provider?: string; startingCapital?: string; charges?: unknown; risk?: unknown } | null;
  return (
    <div className="space-y-4">
      <pre className="overflow-auto rounded-xl border border-border bg-panel p-4 text-xs">{JSON.stringify(settings, null, 2)}</pre>
      {view === "trading" ? (
        <form className="rounded-xl border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("starting")); if (!window.confirm("Change the starting capital used for new accounts and resets?")) return; void send({ action: "settings", key: "trading.startingCapitalPaise", value: String(Math.round(Number(value) * 100)) }); }}>
          <p className="text-sm text-muted">Starting capital for new practice periods, in rupees. Provider credentials stay in environment variables and are not stored here.</p>
          <input name="starting" defaultValue={settings?.startingCapital ?? "100000.00"} className="mt-3 rounded border border-border bg-elevated px-2 py-2" />
          <button className="ml-2 rounded bg-primary px-3 py-2 text-white">Save</button>
        </form>
      ) : (
        <p className="text-sm text-muted">The active provider is {settings?.provider}. Set MARKET_DATA_PROVIDER and MARKET_DATA_API_KEY in Vercel. Demo mode is labelled and synthetic.</p>
      )}
    </div>
  );
}

type AuditRow = { id: string; at: string; actor: string; action: string; targetType: string; targetId: string; reason: string };
function Audit({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-panel">
      <table className="w-full text-left text-sm">
        <thead className="text-muted"><tr><th className="p-3">When</th><th>Actor</th><th>Action</th><th>Target</th><th>Reason</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td className="p-3 text-muted" colSpan={5}>No audit events.</td></tr> : null}
          {rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3 whitespace-nowrap">{new Date(row.at).toLocaleString("en-IN")}</td><td>{row.actor}</td><td>{row.action}</td><td>{row.targetType}</td><td>{row.reason}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Health({ data }: { data: unknown }) {
  return <pre className="overflow-auto rounded-xl border border-border bg-panel p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>;
}
