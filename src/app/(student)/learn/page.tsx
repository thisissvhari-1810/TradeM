"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/components/api";

type Catalog = Array<{ slug: string; title: string; description: string; level: string; lessons: Array<{ slug: string; title: string; summary: string; minutes: number; completed: boolean; quizPassed: boolean }> }>;

export default function LearnPage() {
  const [paths, setPaths] = useState<Catalog>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api<Catalog>("/api/workspace?view=learn").then(setPaths).catch((caught) => setError(caught.message)).finally(() => setReady(true));
  }, []);
  if (error) return <p className="text-loss">{error}</p>;
  if (!ready) return <p className="text-muted">Loading lessons…</p>;
  if (!paths.length) return <p className="text-muted">No published lessons yet. An administrator can add them after seeding the database.</p>;
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Learning centre</h1>
      {paths.map((path) => (
        <div key={path.slug}>
          <h2 className="text-lg font-medium">{path.title}</h2>
          <p className="text-sm text-muted">{path.description}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {path.lessons.map((lesson) => (
              <Link key={lesson.slug} href={`/learn/${lesson.slug}`} className="rounded-xl border border-border bg-panel p-4">
                <p className="text-xs text-muted">{path.level} · {lesson.minutes} min</p>
                <h3 className="mt-1 font-medium">{lesson.title}</h3>
                <p className="mt-1 text-sm text-muted">{lesson.summary}</p>
                <p className="mt-2 text-xs">{lesson.completed ? "Completed" : "Not completed"}{lesson.quizPassed ? " · Quiz passed" : ""}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
