"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/components/api";

const studentLinks = [
  ["/terminal", "Terminal"],
  ["/portfolio", "Portfolio"],
  ["/orders", "Orders"],
  ["/journal", "Journal"],
  ["/learn", "Learn"],
  ["/analytics", "Analytics"],
  ["/competitions", "Competitions"],
  ["/account", "Account"],
];

const adminLinks = [
  ["/admin", "Overview"],
  ["/admin/users", "Users"],
  ["/admin/classes", "Classes"],
  ["/admin/orders", "Orders"],
  ["/admin/learning", "Learning"],
  ["/admin/competitions", "Competitions"],
  ["/admin/reports", "Reports"],
  ["/admin/market", "Market data"],
  ["/admin/trading", "Trading"],
  ["/admin/audit", "Audit"],
  ["/admin/health", "Health"],
];

export function AppShell({ role, name, children }: { role: string; name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "STUDENT" ? studentLinks : role === "INSTRUCTOR" ? adminLinks.filter(([href]) => !["/admin/audit", "/admin/trading", "/admin/market", "/admin/reports"].includes(href)) : adminLinks;
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-panel">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <Link href={role === "STUDENT" ? "/terminal" : "/admin"} className="font-semibold tracking-tight">TradeLab</Link>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{name}</span>
            <span className="rounded border border-border px-2 py-0.5 text-xs">{role.replaceAll("_", " ")}</span>
            <button
              className="rounded border border-border px-2 py-1 text-text"
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
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {links.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${active ? "bg-elevated text-text" : "text-muted"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
