import { Suspense } from "react";
import { connection } from "next/server";
import { requirePageUser } from "@/server/guard";
import { AppShell } from "@/components/shell";

export const instant = false;

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading administration…</p>}>
      <ManageGate>{children}</ManageGate>
    </Suspense>
  );
}

async function ManageGate({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requirePageUser(["SUPER_ADMIN", "INSTRUCTOR"]);
  return <AppShell role={user.role} name={user.name}>{children}</AppShell>;
}
