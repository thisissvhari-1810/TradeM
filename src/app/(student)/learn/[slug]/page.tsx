"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/components/api";

type Lesson = { title: string; summary: string; body: string; level: string; minutes: number; videoUrl: string; pathTitle: string; completed: boolean; quizPassed: boolean; questions: Array<{ id: string; prompt: string; options: string[] }> };
type Review = { score: number; passed: boolean; review: Array<{ prompt: string; correct: boolean; explanation: string }> };

export default function LessonPage() {
  const params = useParams<{ slug: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!params.slug) return;
    api<Lesson>(`/api/workspace?view=lesson&slug=${params.slug}`).then((item) => {
      setLesson(item);
      setAnswers(item.questions.map(() => 0));
    }).catch((caught) => setError(caught.message));
  }, [params.slug]);
  if (error) return <p className="text-loss">{error}</p>;
  if (!lesson) return <p className="text-muted">Loading lesson…</p>;
  const videoId = youtubeId(lesson.videoUrl);
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <p className="text-xs text-muted">{lesson.pathTitle} · {lesson.level} · {lesson.minutes} min</p>
      <h1 className="text-3xl font-semibold">{lesson.title}</h1>
      <p className="text-muted">{lesson.summary}</p>
      {videoId ? <iframe className="aspect-video w-full rounded-xl" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" /> : lesson.videoUrl ? <a className="text-primary" href={lesson.videoUrl}>Open video</a> : null}
      <div className="space-y-3 whitespace-pre-wrap leading-7">{lesson.body}</div>
      <button className="rounded bg-primary px-3 py-2 text-sm text-white" onClick={() => api("/api/workspace", { action: "complete", slug: params.slug }).then(() => setLesson({ ...lesson, completed: true })).catch((caught) => setError(caught.message))}>{lesson.completed ? "Completed" : "Mark complete"}</button>
      {lesson.questions.length ? (
        <form className="rounded-xl border border-border bg-panel p-4" onSubmit={(event) => { event.preventDefault(); api<Review>("/api/workspace", { action: "quiz", slug: params.slug, answers }).then(setReview).catch((caught) => setError(caught.message)); }}>
          <h2 className="font-medium">Quiz</h2>
          {lesson.questions.map((question, index) => (
            <fieldset key={question.id} className="mt-4">
              <legend className="text-sm">{question.prompt}</legend>
              {question.options.map((option, optionIndex) => (
                <label key={option} className="mt-1 block text-sm text-muted">
                  <input type="radio" name={question.id} className="mr-2" checked={answers[index] === optionIndex} onChange={() => setAnswers((current) => current.map((value, valueIndex) => valueIndex === index ? optionIndex : value))} />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <button className="mt-4 rounded bg-primary px-3 py-2 text-sm text-white">Submit quiz</button>
          {review ? <p className="mt-3 text-sm">{review.passed ? "Passed" : "Not passed"} · score {review.score}. {review.review.map((item) => item.explanation).join(" ")}</p> : null}
        </form>
      ) : null}
    </article>
  );
}

function youtubeId(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    if (parsed.hostname.endsWith("youtube.com")) return parsed.searchParams.get("v") ?? "";
  } catch {
    return "";
  }
  return "";
}
