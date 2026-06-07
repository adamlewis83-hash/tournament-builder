"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    setTheme(t);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("seeded-theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light/dark"
      title={theme === "dark" ? "Switch to light (sunlight) mode" : "Switch to dark mode"}
      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] transition"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
