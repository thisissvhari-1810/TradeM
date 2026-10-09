import { Suspense } from "react";
import { connection } from "next/server";
import { requirePageUser } from "@/server/guard";
import { AppShell } from "@/components/shell";

export const instant = false;

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading your practice account…</p>}>
      <StudentGate>{children}</StudentGate>
    </Suspense>
  );
}

async function StudentGate({ children }: { children: React.ReactNode }) {
  await connection();
  const user = await requirePageUser(["STUDENT"]);
  return <AppShell role={user.role} name={user.name}>{children}</AppShell>;
}
