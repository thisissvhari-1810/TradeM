import type { ReactNode } from "react";

export function PageFrame({ kicker, title, lede, children }: { kicker?: string; title: string; lede?: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <header>
        {kicker ? <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{kicker}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold text-text">{title}</h1>
        {lede ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{lede}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-1 font-mono text-lg tabular-nums ${className}`}>{value}</p>
    </div>
  );
}
