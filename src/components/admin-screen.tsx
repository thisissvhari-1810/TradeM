"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, tone } from "@/components/api";

type View = "overview" | "users" | "classes" | "orders" | "history" | "learning" | "competitions" | "reports" | "market" | "trading" | "audit" | "health";

export function AdminScreen({ view }: { view: View }) {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const remote = adminRemote(view);
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
      const remote = adminRemote(view);
      const path = remote ? `/api/admin?view=${remote}` : "/api/admin";
      setData(await api(path));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
      return false;
    }
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      {view === "overview" ? null : <DeskHeader view={view} />}
      {message ? <p className="text-sm text-profit">{message}</p> : null}
      {error ? <p className="text-sm text-loss">{error}</p> : null}
      {data == null && !error ? <p className="text-sm text-muted">Loading…</p> : null}
      {view === "overview" && data ? <Overview data={data as Desk} /> : null}
      {view === "users" ? <Users data={data as UserPage | null} query={query} setQuery={setQuery} page={page} setPage={setPage} send={send} /> : null}
      {view === "classes" && data ? <Classes rows={data as ClassRow[]} send={send} /> : null}
      {view === "orders" && data ? <Orders rows={data as OrderRow[]} /> : null}
      {view === "history" && data ? <History rows={data as HistoryRow[]} /> : null}
      {view === "learning" && data ? <Learning rows={data as LessonRow[]} send={send} /> : null}
      {view === "competitions" && data ? <Competitions rows={data as CompetitionRow[]} send={send} /> : null}
      {view === "reports" && data ? <Reports data={data as AnalyticsDesk} /> : null}
      {view === "market" || view === "trading" ? data ? <Settings view={view} data={data} send={send} /> : null : null}
      {view === "audit" && data ? <Audit rows={data as AuditRow[]} /> : null}
      {view === "health" && data ? <Health data={data as HealthDesk} /> : null}
    </section>
  );
}

function adminRemote(view: View) {
  if (view === "trading") return "settings";
  if (view === "market") return "instruments";
  if (view === "learning") return "lessons";
  if (view === "competitions") return "competitions";
  if (view === "reports") return "analytics";
  if (view === "overview") return "";
  return view;
}

const DESK_COPY: Record<Exclude<View, "overview">, { kicker: string; title: string; lede: string }> = {
  users: { kicker: "People", title: "Students", lede: "Accounts in your scope. Cash figures are virtual. Passwords are never shown." },
  classes: { kicker: "Classroom", title: "Classes", lede: "Groups you teach. Enrolment uses the class id and the student id from the Students desk." },
  orders: { kicker: "Activity", title: "Orders", lede: "Simulated orders in your scope. A closed round trip is listed on History." },
  history: { kicker: "Paper trading", title: "Trade history", lede: "A row is saved when a long position returns to zero shares. Times are India Standard Time." },
  learning: { kicker: "Study", title: "Learn", lede: "Published lessons students see on their Learn page. Indicators describe past prices. They do not predict the next move." },
  competitions: { kicker: "Class", title: "Challenges", lede: "Rankings use return, drawdown, and learning completion. Cash adjustments are removed from the return." },
  reports: { kicker: "Review", title: "Analytics", lede: "Counts come from stored orders and closed trades in your scope. The CSV export includes student names and emails." },
  market: { kicker: "Catalogue", title: "Markets", lede: "Paste a new Dhan access token here each day. The table shows the first 80 stocks. Students can search the full NSE list." },
  trading: { kicker: "Practice book", title: "Trading", lede: "Starting capital applies to new practice periods and resets. The daily Dhan access token is saved on Markets." },
  audit: { kicker: "Record", title: "Audit", lede: "Account, class, competition, instrument, and settings changes." },
  health: { kicker: "System", title: "Health", lede: "Database reachability and the last market-data status. This is not a live price." },
};

function DeskHeader({ view }: { view: Exclude<View, "overview"> }) {
  const copy = DESK_COPY[view];
  return (
    <header>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{copy.kicker}</p>
      <h1 className="mt-1 text-xl font-semibold">{copy.title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{copy.lede}</p>
    </header>
  );
}

type Desk = {
  name: string;
  students: number;
  orders: number;
  openOrders: number;
  closedTrades: number;
  lessons: number;
  competitions: number;
  classes: number;
  provider: string;
  database: string;
  market: { mode: string; message: string; provider: string } | null;
  recentOrders: Array<{ id: string; student: string; symbol: string; side: string; type: string; quantity: number; status: string; submittedAt: string }>;
  recentTrades: Array<{ id: string; student: string; symbol: string; quantity: number; net: string; exitAt: string; hasReceipt: boolean }>;
};

function Overview({ data }: { data: Desk }) {
  const [quote, setQuote] = useState<{ mode: string; marketOpen: boolean; message: string } | null>(null);
  useEffect(() => {
    api<{ mode: string; marketOpen: boolean; message: string }>("/api/market/quote?symbol=RELIANCE").then(setQuote).catch(() => setQuote(null));
  }, []);
  const session = quote ? (quote.marketOpen ? "Open" : "Closed") : "Unknown";
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border border-border bg-panel px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Administration · paper trading</p>
          <h1 className="mt-1 font-serif text-xl">Welcome back{data.name ? `, ${data.name}` : ""}</h1>
          <p className="mt-1 text-sm text-muted">NSE cash session: {session}. {quote ? `${quote.mode} · ${quote.message}` : data.market?.message || "Market status is not available yet."}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/users" className="bg-primary px-3 py-2 text-on-primary">Students</Link>
          <Link href="/admin/orders" className="border border-border px-3 py-2">Orders</Link>
        </div>
      </header>
      <section className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Students", String(data.students)],
          ["Classes", String(data.classes)],
          ["Orders", String(data.orders)],
          ["Open orders", String(data.openOrders)],
          ["Closed trades", String(data.closedTrades)],
          ["Lessons", String(data.lessons)],
          ["Challenges", String(data.competitions)],
          ["Data", `${data.provider} · ${data.database}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 font-mono text-sm">{value}</p>
          </div>
        ))}
      </section>
      <section className="overflow-x-auto border border-border bg-panel">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-sm font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs text-primary">All orders</Link>
        </div>
        <table className="text-sm">
          <thead><tr><th>Time</th><th>Student</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th></tr></thead>
          <tbody>
            {data.recentOrders.length === 0 ? <tr><td colSpan={7} className="text-muted">No orders yet.</td></tr> : null}
            {data.recentOrders.map((order) => (
              <tr key={order.id}>
                <td className="text-muted">{new Date(order.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td>{order.student}</td>
                <td>{order.symbol}</td>
                <td className={order.side === "BUY" ? "text-profit" : "text-loss"}>{order.side}</td>
                <td>{order.type}</td>
                <td className="font-mono">{order.quantity}</td>
                <td>{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto border border-border bg-panel">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-sm font-semibold">Closed trades</h2>
          <Link href="/admin/history" className="text-xs text-primary">Trade history</Link>
        </div>
        {data.recentTrades.length === 0 ? <p className="border-t border-border px-3 py-3 text-sm text-muted">No position has been closed yet.</p> : null}
        {data.recentTrades.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-border px-3 py-2 text-sm">
            <span>{row.student} · {row.symbol} · {row.quantity}</span>
            <span className="text-muted">{new Date(row.exitAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
            <span className={`font-mono ${tone(row.net)}`}>{row.net}</span>
          </div>
        ))}
      </section>
      <nav className="flex flex-wrap gap-2">
        {[
          ["/admin/users", "Students"],
          ["/admin/classes", "Classes"],
          ["/admin/orders", "Orders"],
          ["/admin/history", "History"],
          ["/admin/market", "Markets"],
          ["/admin/learning", "Learn"],
          ["/admin/competitions", "Challenges"],
          ["/admin/reports", "Analytics"],
          ["/admin/health", "Health"],
        ].map(([href, label]) => <Link key={href} href={href} className="border border-border bg-elevated px-3 py-1.5 text-sm">{label}</Link>)}
      </nav>
    </div>
  );
}

type UserRow = { id: string; name: string; email: string; role: string; status: string; tradingEnabled: boolean; cashAvailable: string | null; period: string | null };
type UserPage = { users: UserRow[]; total: number; page: number };

function Users({ data, query, setQuery, page, setPage, send }: { data: UserPage | null; query: string; setQuery: (value: string) => void; page: number; setPage: (value: number) => void; send: (body: Record<string, unknown>) => Promise<boolean> }) {
  return (
    <div className="space-y-4">
      <form className="grid gap-2 border border-border bg-panel p-4 md:grid-cols-3" onSubmit={(event) => submitUser(event, send)}>
        <input name="name" required placeholder="Name" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="email" type="email" required placeholder="Email" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="password" type="password" required placeholder="Temporary password" className="rounded border border-border bg-elevated px-2 py-2" />
        <select name="role" className="rounded border border-border bg-elevated px-2 py-2"><option>STUDENT</option><option>INSTRUCTOR</option><option>SUPER_ADMIN</option></select>
        <input name="startingRupees" placeholder="Starting ₹ for students" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="classId" placeholder="Class id (optional)" className="rounded border border-border bg-elevated px-2 py-2" />
        <button className="rounded bg-primary px-3 py-2 text-on-primary">Create account</button>
      </form>
      <div className="flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="rounded border border-border bg-panel px-3 py-2" />
        <button className="rounded border border-border px-3" onClick={() => setPage(Math.max(1, page - 1))}>Previous</button>
        <button className="rounded border border-border px-3" onClick={() => setPage(page + 1)}>Next</button>
      </div>
      <div className="overflow-x-auto border border-border bg-panel">
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

function submitUser(event: FormEvent<HTMLFormElement>, send: (body: Record<string, unknown>) => Promise<boolean>) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (!window.confirm("Create this account with virtual funds?")) return;
  void send({ action: "create-user", name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role"), startingRupees: form.get("startingRupees") || undefined, classId: form.get("classId") || undefined });
}

function fund(send: (body: Record<string, unknown>) => Promise<boolean>, userId: string, direction: "credit" | "debit") {
  const amountRupees = window.prompt(direction === "credit" ? "Rupees to credit" : "Rupees to debit");
  const reason = window.prompt("Reason");
  if (!amountRupees || !reason) return;
  if (!window.confirm(`${direction} ₹${amountRupees}? This writes a ledger entry.`)) return;
  void send({ action: "funds", userId, direction, amountRupees, reason });
}

function confirmSend(send: (body: Record<string, unknown>) => Promise<boolean>, body: Record<string, unknown>) {
  if (!body.reason) return;
  if (!window.confirm("Confirm this account change?")) return;
  void send(body);
}

type ClassRow = { id: string; name: string; description: string; instructor: string; students: number };
function Classes({ rows, send }: { rows: ClassRow[]; send: (body: Record<string, unknown>) => Promise<boolean> }) {
  return (
    <div className="space-y-4">
      <form className="grid gap-2 border border-border bg-panel p-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void send({ action: "class", name: form.get("name"), description: form.get("description"), instructorId: form.get("instructorId") }); }}>
        <input name="name" required placeholder="Class name" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="description" placeholder="Description" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="instructorId" placeholder="Instructor user id" className="rounded border border-border bg-elevated px-2 py-2" />
        <button className="rounded bg-primary px-3 py-2 text-on-primary">Create class</button>
      </form>
      <form className="grid gap-2 border border-border bg-panel p-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void send({ action: "enroll", classId: form.get("classId"), userId: form.get("userId") }); }}>
        <input name="classId" required placeholder="Class id" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="userId" required placeholder="Student user id" className="rounded border border-border bg-elevated px-2 py-2" />
        <button className="rounded bg-primary px-3 py-2 text-on-primary">Enrol student</button>
      </form>
      <div className="overflow-x-auto border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Class</th><th>Instructor</th><th>Students</th><th>Id</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={4} className="text-muted">No classes in this scope.</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}<span className="block text-xs text-muted">{row.description || "—"}</span></td>
                <td>{row.instructor}</td>
                <td className="font-mono">{row.students}</td>
                <td className="font-mono text-xs text-muted">{row.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <form key={row.id} className="border border-border bg-panel p-4 text-sm" onSubmit={(event) => { event.preventDefault(); const body = String(new FormData(event.currentTarget).get("body")); api("/api/workspace", { action: "feedback", journalId: row.id, body }).then(() => setNote("Feedback saved.")).catch((caught) => setNote(caught.message)); }}>
          <p className="text-muted">{row.student}</p>
          <p className="mt-1">{row.thesis}</p>
          <textarea name="body" required placeholder="Feedback" className="mt-2 w-full rounded border border-border bg-elevated p-2" />
          <button className="mt-2 rounded bg-primary px-3 py-1.5 text-on-primary">Send feedback</button>
        </form>
      ))}
    </div>
  );
}

type HistoryRow = { id: string; student?: string; symbol: string; name: string; quantity: number; exitAt: string; averageEntry: string; averageExit: string; gross: string; charges: string; net: string; ret: string; profitable: boolean; loss: boolean; holdingSeconds: number; receipt: boolean };
function History({ rows }: { rows: HistoryRow[] }) {
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");
  const [symbol, setSymbol] = useState("");
  const visible = rows.filter((row) => {
    if (filter === "win" && !row.profitable) return false;
    if (filter === "loss" && !row.loss) return false;
    if (symbol && !`${row.symbol} ${row.student ?? ""}`.toLowerCase().includes(symbol.trim().toLowerCase())) return false;
    return true;
  });
  const wins = rows.filter((row) => row.profitable).length;
  const losses = rows.filter((row) => row.loss).length;
  return (
    <div className="space-y-3">
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Closed trades", String(rows.length)],
          ["Winners", String(wins)],
          ["Losers", String(losses)],
          ["Win rate", rows.length ? `${((wins / rows.length) * 100).toFixed(1)}%` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-2"><p className="text-[10px] uppercase text-muted">{label}</p><p className="mt-1 font-mono text-sm">{value}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "win", "loss"] as const).map((item) => (
          <button key={item} className={`h-8 px-2 text-xs ${filter === item ? "bg-primary text-on-primary" : "border border-border"}`} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "win" ? "Profitable" : "Losses"}</button>
        ))}
        <input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="Symbol or student" aria-label="Filter symbol or student" className="h-8 w-44 px-2 text-xs" />
      </div>
      <div className="overflow-x-auto border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Closed</th><th>Student</th><th>Symbol</th><th>Qty</th><th>Entry</th><th>Exit</th><th>Held</th><th>Gross</th><th>Charges</th><th>Net</th><th>Return</th><th></th></tr></thead>
          <tbody>
            {visible.length === 0 ? <tr><td colSpan={12} className="text-muted">No closed positions match this filter.</td></tr> : null}
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap text-muted">{new Date(row.exitAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td>{row.student ?? "—"}</td>
                <td>{row.symbol}<span className="block text-xs text-muted">{row.name}</span></td>
                <td className="font-mono">{row.quantity}</td>
                <td className="font-mono">{row.averageEntry}</td>
                <td className="font-mono">{row.averageExit}</td>
                <td>{holdLabel(row.holdingSeconds)}</td>
                <td className={`font-mono ${tone(row.gross)}`}>{row.gross}</td>
                <td className="font-mono">{row.charges}</td>
                <td className={`font-mono ${tone(row.net)}`}>{row.net}</td>
                <td className={`font-mono ${tone(row.ret)}`}>{row.ret}</td>
                <td>{row.receipt ? <a className="text-primary" href={`/api/trades/${row.id}/receipt`} target="_blank" rel="noreferrer">Receipt</a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function holdLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

type OrderRow = { id: string; student: string; email: string; symbol: string; side: string; type: string; quantity: number; status: string; submittedAt: string; reason: string | null };
function Orders({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="overflow-x-auto border border-border bg-panel">
      <table className="text-sm">
        <thead><tr><th>When</th><th>Student</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Status</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td className="text-muted" colSpan={7}>No orders in this scope.</td></tr> : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap text-muted">{new Date(row.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
              <td>{row.student}<span className="block text-xs text-muted">{row.email}</span></td>
              <td>{row.symbol}</td>
              <td className={row.side === "BUY" ? "text-profit" : "text-loss"}>{row.side}</td>
              <td>{row.type}</td>
              <td className="font-mono">{row.quantity}</td>
              <td>{row.status}{row.reason ? ` · ${row.reason}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type LessonRow = { id: string; title: string; summary: string; level: string; path: string; pathSlug: string; minutes: number; published: boolean; completions: number };
function Learning({ rows, send }: { rows: LessonRow[]; send: (body: Record<string, unknown>) => Promise<boolean> }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Lesson</th><th>Path</th><th>Level</th><th>Minutes</th><th>Completions</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={6} className="text-muted">No lessons yet.</td></tr> : null}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.title}<span className="block text-xs text-muted">{row.summary}</span></td>
                <td>{row.path}<span className="block font-mono text-xs text-muted">{row.pathSlug}</span></td>
                <td>{row.level}</td>
                <td className="font-mono">{row.minutes}</td>
                <td className="font-mono">{row.completions}</td>
                <td>{row.published ? "Published" : "Hidden"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="grid gap-2 border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void send({ action: "lesson", title: form.get("title"), summary: form.get("summary"), body: form.get("body"), level: form.get("level"), pathSlug: form.get("pathSlug"), videoUrl: form.get("videoUrl") }); }}>
        <p className="text-sm font-semibold">Add a lesson</p>
        <input name="title" required placeholder="Lesson title" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="pathSlug" required placeholder="Path slug: beginner, intermediate, or advanced" className="rounded border border-border bg-elevated px-2 py-2" />
        <select name="level" className="rounded border border-border bg-elevated px-2 py-2"><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option></select>
        <input name="summary" required placeholder="Summary" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="videoUrl" placeholder="https video URL" className="rounded border border-border bg-elevated px-2 py-2" />
        <textarea name="body" required placeholder="Lesson body" className="h-40 rounded border border-border bg-elevated p-2" />
        <button className="rounded bg-primary px-3 py-2 text-on-primary">Publish lesson</button>
      </form>
    </div>
  );
}

type CompetitionRow = { id: string; title: string; description: string; status: string; className: string; startsAt: string; endsAt: string; participants: number; weights: { return: number; drawdown: number; learning: number } };
function Competitions({ rows, send }: { rows: CompetitionRow[]; send: (body: Record<string, unknown>) => Promise<boolean> }) {
  return (
    <div className="space-y-4">
      {rows.length === 0 ? <p className="border border-border bg-panel px-4 py-6 text-sm text-muted">No challenges in this scope.</p> : null}
      {rows.map((row) => (
        <article key={row.id} className="border border-border bg-panel">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">{row.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{row.description || "No description."}</p>
              <p className="mt-2 text-xs text-muted">{row.className} · {row.participants} joined · weights {row.weights.return}/{row.weights.drawdown}/{row.weights.learning}</p>
            </div>
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted">{row.status}</span>
          </div>
          <p className="px-4 py-2 text-xs text-muted">{new Date(row.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} – {new Date(row.endsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
        </article>
      ))}
      <form className="grid gap-2 border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (!window.confirm("Open this competition?")) return; void send({ action: "competition", title: form.get("title"), description: form.get("description"), classId: form.get("classId") || undefined, startsAt: form.get("startsAt"), endsAt: form.get("endsAt"), returnWeight: Number(form.get("returnWeight")), drawdownWeight: Number(form.get("drawdownWeight")), learningWeight: Number(form.get("learningWeight")) }); }}>
        <p className="text-sm font-semibold">Open a challenge</p>
        <input name="title" required placeholder="Title" className="rounded border border-border bg-elevated px-2 py-2" />
        <textarea name="description" placeholder="Description" className="rounded border border-border bg-elevated p-2" />
        <input name="classId" placeholder="Limit to class id, or leave blank" className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="startsAt" type="datetime-local" required className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="endsAt" type="datetime-local" required className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="returnWeight" type="number" defaultValue={50} className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="drawdownWeight" type="number" defaultValue={30} className="rounded border border-border bg-elevated px-2 py-2" />
        <input name="learningWeight" type="number" defaultValue={20} className="rounded border border-border bg-elevated px-2 py-2" />
        <button className="rounded bg-primary px-3 py-2 text-on-primary">Create competition</button>
      </form>
    </div>
  );
}

type AnalyticsDesk = { closedTrades: number; wins: number; losses: number; winRate: string; net: string; orders: Array<{ status: string; count: number }> };
function Reports({ data }: { data: AnalyticsDesk }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Closed trades", String(data.closedTrades)],
          ["Winners", String(data.wins)],
          ["Losers", String(data.losses)],
          ["Win rate", data.winRate],
          ["Net", data.net],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-2">
            <p className="text-[10px] uppercase text-muted">{label}</p>
            <p className={`mt-1 font-mono text-sm ${label === "Net" ? tone(value) : ""}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto border border-border bg-panel">
        <table className="text-sm">
          <thead><tr><th>Order status</th><th>Count</th></tr></thead>
          <tbody>
            {data.orders.length === 0 ? <tr><td colSpan={2} className="text-muted">No orders in this scope.</td></tr> : null}
            {data.orders.map((row) => <tr key={row.status}><td>{row.status}</td><td className="font-mono">{row.count}</td></tr>)}
          </tbody>
        </table>
      </div>
      <a className="inline-block bg-primary px-3 py-2 text-sm text-on-primary" href="/api/admin?view=report">Download order report</a>
    </div>
  );
}

type InstrumentRow = { symbol: string; name: string; exchange: string; sector: string; isActive: boolean };
type DhanToken = { source: "saved" | "server" | "missing"; expiresAt: string | null; expired: boolean; updatedAt: string | null };
function Settings({ view, data, send }: { view: "market" | "trading"; data: unknown; send: (body: Record<string, unknown>) => Promise<boolean> }) {
  const settings = data as { provider?: string; startingCapital?: string; charges?: Record<string, string | number>; risk?: Record<string, unknown> } | null;
  const market = data && typeof data === "object" && !Array.isArray(data) && "instruments" in data ? data as { instruments: InstrumentRow[]; dhan: DhanToken } : null;
  const instruments = market?.instruments ?? (Array.isArray(data) ? data as InstrumentRow[] : []);
  const dhan = market?.dhan;
  const expiry = dhan?.expiresAt ? new Date(dhan.expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : null;
  return (
    <div className="space-y-4">
      {view === "market" ? (
        <form className="border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const token = String(new FormData(form).get("token") ?? "").trim(); void send({ action: "dhan-token", token }).then((saved) => { if (saved) form.reset(); }); }}>
          <p className="text-sm font-semibold">Dhan access token</p>
          <p className="mt-1 text-sm text-muted">Dhan access tokens last about 24 hours. Generate a new one on Dhan Web, paste it here, and save. Charts use the new token immediately. The client id stays the same.</p>
          <p className="mt-2 text-sm">{dhan?.source === "missing" ? "No token is saved yet." : dhan?.expired ? `The saved token expired ${expiry}.` : expiry ? `The current token runs until ${expiry} IST.` : "A token is set. Its expiry is not shown."}</p>
          <input name="token" type="password" autoComplete="off" placeholder="Paste the new access token" aria-label="Dhan access token" className="mt-3 w-full max-w-xl rounded border border-border bg-elevated px-3 py-2 text-sm" />
          <button className="mt-3 bg-primary px-3 py-2 text-sm text-on-primary">Save token</button>
        </form>
      ) : null}
      {view === "market" ? (
        <div className="overflow-x-auto border border-border bg-panel">
          <table className="text-sm">
            <thead><tr><th>Symbol</th><th>Name</th><th>Exchange</th><th>Sector</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {instruments.length === 0 ? <tr><td colSpan={6} className="text-muted">No instruments in the catalogue.</td></tr> : null}
              {instruments.map((row) => (
                <tr key={row.symbol}>
                  <td className="font-semibold">{row.symbol}</td>
                  <td>{row.name}</td>
                  <td>{row.exchange}</td>
                  <td>{row.sector}</td>
                  <td>{row.isActive ? "Active" : "Hidden"}</td>
                  <td><button className="text-primary" onClick={() => send({ action: "instrument", symbol: row.symbol, isActive: !row.isActive })}>{row.isActive ? "Hide" : "Enable"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : settings ? (
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Provider", settings.provider ?? "—"],
            ["Starting capital", settings.startingCapital ? `₹${settings.startingCapital}` : "—"],
            ...Object.entries(settings.charges ?? {}).map(([key, value]) => [chargeLabel(key), String(value)] as [string, string]),
            ...Object.entries(settings.risk ?? {}).map(([key, value]) => [chargeLabel(key), Array.isArray(value) ? value.join(", ") : String(value)] as [string, string]),
          ].map(([label, value]) => (
            <div key={label} className="bg-panel px-3 py-2">
              <p className="text-[10px] uppercase text-muted">{label}</p>
              <p className="mt-1 font-mono text-sm">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {view === "trading" ? (
        <form className="border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("starting")); if (!window.confirm("Change the starting capital used for new accounts and resets?")) return; void send({ action: "settings", key: "trading.startingCapitalPaise", value: String(Math.round(Number(value) * 100)) }); }}>
          <p className="text-sm text-muted">Starting capital for new practice periods, in rupees.</p>
          <input name="starting" defaultValue={settings?.startingCapital ?? "100000.00"} className="mt-3 rounded border border-border bg-elevated px-2 py-2" />
          <button className="ml-2 rounded bg-primary px-3 py-2 text-on-primary">Save</button>
        </form>
      ) : null}
    </div>
  );
}

type AuditRow = { id: string; at: string; actor: string; action: string; targetType: string; targetId: string; reason: string };
function Audit({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="overflow-x-auto border border-border bg-panel">
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

const SETTING_LABELS: Record<string, string> = {
  brokeragePercent: "Brokerage %",
  brokerageCapPaise: "Brokerage cap (paise)",
  sttSellPercent: "STT sell %",
  exchangePercent: "Exchange %",
  sebiPerCrorePaise: "SEBI per crore (paise)",
  stampBuyPercent: "Stamp buy %",
  gstPercent: "GST %",
  slippageBps: "Slippage bps",
  spreadBps: "Spread bps",
  maxOrderQuantity: "Max order quantity",
  maxOrderValuePaise: "Max order value (paise)",
  maxPositionPercent: "Max position %",
  staleRealtimeSeconds: "Stale realtime (s)",
  staleDelayedSeconds: "Stale delayed (s)",
  staleDemoSeconds: "Stale demo (s)",
  demoFillWhenClosed: "Demo fill when closed",
  allowedOrderTypes: "Allowed order types",
};
function chargeLabel(key: string) {
  return SETTING_LABELS[key] ?? key;
}

type HealthDesk = { database: string; provider: string; now: string; market: { provider: string; mode: string; message: string; lastSuccessAt: string | null; lastErrorAt: string | null; lastError: string } | null };
function Health({ data }: { data: HealthDesk }) {
  const when = (value: string | null) => value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—";
  return (
    <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["Database", data.database],
        ["Provider", data.provider],
        ["Mode", data.market?.mode ?? "Unknown"],
        ["Feed", data.market?.provider ?? "—"],
        ["Message", data.market?.message ?? "Market status is not available."],
        ["Last success", when(data.market?.lastSuccessAt ?? null)],
        ["Last error", data.market?.lastError ? `${when(data.market.lastErrorAt)} · ${data.market.lastError}` : "—"],
        ["Checked", when(data.now)],
      ].map(([label, value]) => (
        <div key={label} className="bg-panel px-3 py-2">
          <p className="text-[10px] uppercase text-muted">{label}</p>
          <p className="mt-1 text-sm">{value}</p>
        </div>
      ))}
    </div>
  );
}
