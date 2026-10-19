"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/api";
import { PageFrame } from "@/components/page-frame";

type Catalog = Array<{ slug: string; title: string; description: string; level: string; lessons: Array<{ slug: string; title: string; summary: string; minutes: number; completed: boolean; quizPassed: boolean }> }>;

export default function LearnPage() {
  const [paths, setPaths] = useState<Catalog>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api<Catalog>("/api/workspace?view=learn").then(setPaths).catch((caught) => setError(caught.message)).finally(() => setReady(true));
  }, []);
  if (error) return <p className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">{error}</p>;
  if (!ready) return <p className="text-sm text-muted">Loading lessons…</p>;
  if (!paths.length) return <PageFrame kicker="Study" title="Learn" lede="No published lessons yet. An administrator can add them after seeding the database."><span /></PageFrame>;
  return (
    <PageFrame kicker="Study" title="Learn" lede="Short lessons and quizzes. Indicators describe past prices. They do not predict the next move.">
      {paths.map((path) => (
        <div key={path.slug}>
          <h2 className="text-lg font-semibold">{path.title}</h2>
          <p className="mt-1 text-sm text-muted">{path.description}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {path.lessons.map((lesson) => (
              <Link key={lesson.slug} href={`/learn/${lesson.slug}`} className="rounded-lg border border-border bg-panel p-4 transition hover:border-[#2962ff]">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{path.level} · {lesson.minutes} min</p>
                <h3 className="mt-2 text-base font-semibold">{lesson.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{lesson.summary}</p>
                <p className="mt-3 text-xs">
                  <span className={lesson.completed ? "text-profit" : "text-muted"}>{lesson.completed ? "Completed" : "Not completed"}</span>
                  {lesson.quizPassed ? <span className="text-profit"> · Quiz passed</span> : null}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </PageFrame>
  );
}
