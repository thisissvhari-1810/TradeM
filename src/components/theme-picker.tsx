"use client";

import { useEffect, useState } from "react";
import { THEMES, applyTheme } from "@/lib/theme";

export function ThemePicker() {
  const [current, setCurrent] = useState("obsidian");
  useEffect(() => {
    const saved = document.documentElement.dataset.theme || localStorage.getItem("tl-theme") || "obsidian";
    setCurrent(THEMES.some((theme) => theme.id === saved) ? saved : applyTheme("obsidian"));
  }, []);
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Colour theme</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            aria-pressed={current === theme.id}
            onClick={() => setCurrent(applyTheme(theme.id))}
            className={`overflow-hidden border text-left ${current === theme.id ? "border-primary" : "border-border"}`}
            style={{ background: theme.panel, color: theme.ink }}
          >
            <span className="block h-1.5" style={{ background: theme.accent }} />
            <span className="block px-2 py-2 text-[11px] leading-4">{theme.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
