"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Settings as SettingsIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { SyncPanel } from "@/components/SyncPanel";

function applyTheme(t: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem("seeded-theme", t);
  } catch {
    /* ignore */
  }
}

function ThemeSetting() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light");
  }, []);
  const choices: [("light" | "dark"), typeof Sun, string][] = [
    ["light", Sun, "Light"],
    ["dark", Moon, "Dark"],
  ];
  return (
    <div className="flex gap-2">
      {choices.map(([val, Icon, label]) => (
        <button
          key={val}
          onClick={() => {
            setTheme(val);
            applyTheme(val);
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition ${
            theme === val
              ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
              : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
          }`}
        >
          <Icon className="h-5 w-5" /> {label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <HydrationGate>
      <h1 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)]">
          <SettingsIcon className="h-5 w-5" />
        </span>
        Settings
      </h1>

      <Card className="p-5 space-y-3">
        <div>
          <h2 className="font-semibold">Appearance</h2>
          <p className="text-sm text-[var(--muted)]">Choose light or dark mode.</p>
        </div>
        <ThemeSetting />
      </Card>

      <div className="mt-4">
        <SyncPanel />
      </div>

      <Card className="p-5 mt-4">
        <h2 className="font-semibold">Home layout</h2>
        <p className="text-sm text-[var(--muted)]">
          More controls coming soon — you&apos;ll be able to choose what shows on your Home screen.
        </p>
      </Card>
    </HydrationGate>
  );
}
