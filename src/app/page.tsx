import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-muted">Educational paper trading</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Practise market decisions with virtual rupees.</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        TradeLab is a learning terminal for students. Balances, orders, and journals stay in a hosted database. Nothing on this platform places a real-money trade or connects to a brokerage.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-md bg-primary px-4 py-2 font-medium text-white" href="/login">Sign in</Link>
        <Link className="rounded-md border border-border bg-panel px-4 py-2" href="/setup">First-time setup</Link>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["Virtual ledger", "Every credit, fill, fee, and reset is an auditable ledger entry in PostgreSQL."],
          ["Labelled market data", "Live, delayed, historical, and demo prices are named as such. Missing credentials use a synthetic demo feed."],
          ["Learning records", "Lessons, quizzes, journals, and competitions sit beside the practice account."],
        ].map(([title, body]) => (
          <section key={title} className="rounded-xl border border-border bg-panel p-5">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
