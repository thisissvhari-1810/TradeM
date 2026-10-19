"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/components/api";

const studentLinks = [
  ["/dashboard", "Home"],
  ["/markets", "Markets"],
  ["/screener", "Screener"],
  ["/terminal", "Chart"],
  ["/options", "Options"],
  ["/orders", "Orders"],
  ["/history", "History"],
  ["/portfolio", "Portfolio"],
  ["/watchlist", "Watchlist"],
  ["/analytics", "Analytics"],
  ["/learn", "Learn"],
  ["/journal", "Journal"],
  ["/competitions", "Challenges"],
  ["/notifications", "Alerts"],
  ["/account", "Settings"],
  ["/help", "Help"],
];

const adminLinks = [
  ["/admin", "Home"],
  ["/admin/users", "Students"],
  ["/admin/classes", "Classes"],
  ["/admin/orders", "Orders"],
  ["/admin/history", "History"],
  ["/admin/market", "Markets"],
  ["/admin/learning", "Learn"],
  ["/admin/competitions", "Challenges"],
  ["/admin/reports", "Analytics"],
  ["/admin/trading", "Trading"],
  ["/admin/audit", "Audit"],
  ["/admin/health", "Health"],
];

export function AppShell({ role, name, children }: { role: string; name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [book, setBook] = useState<{ cashAvailable: string; equity: string } | null>(null);
  const links = role === "STUDENT" ? studentLinks : role === "INSTRUCTOR" ? adminLinks.filter(([href]) => !["/admin/audit", "/admin/trading", "/admin/market", "/admin/reports"].includes(href)) : adminLinks;
  const terminal = pathname === "/terminal";
  useEffect(() => {
    if (role !== "STUDENT" || terminal) return;
    api<{ cashAvailable: string; equity: string }>("/api/portfolio").then(setBook).catch(() => setBook(null));
  }, [role, pathname, terminal]);
  if (terminal) return <div className="h-dvh overflow-hidden bg-background">{children}</div>;
  return (
    <div className="min-h-screen">
      <header className="z-30 border-b border-border bg-panel">
        <div className="h-px bg-primary" />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
          <Link href={role === "STUDENT" ? "/dashboard" : "/admin"} className="flex shrink-0 items-center gap-2.5 font-semibold tracking-wide">
            <span className="grid h-9 w-9 place-items-center bg-primary font-serif text-base text-on-primary">T</span>
            <span className="font-serif text-xl">TradeLab</span>
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-base text-muted">
            {book ? <p className="font-mono text-sm">Cash <span className="text-profit">{book.cashAvailable}</span> · Equity <span className="text-primary">{book.equity}</span></p> : null}
            {role === "STUDENT" ? <Link href="/account" className="max-w-40 truncate text-text">{name}</Link> : <span className="max-w-40 truncate text-text">{name}</span>}
            <button
              className="border border-border bg-background px-3 py-2 text-base text-text"
              onClick={async () => {
                await api("/api/auth/logout", {});
                router.push("/login");
                router.refresh();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1 border-t border-border px-4 py-2">
          {links.map(([href, label]) => {
            const exact = links.some(([item]) => pathname === item);
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={`whitespace-nowrap px-3.5 py-2.5 text-base leading-none ${active ? "bg-primary text-on-primary" : "text-text hover:bg-elevated"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="px-4 py-5">{children}</div>
    </div>
  );
}
