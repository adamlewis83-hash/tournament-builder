"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Settings as SettingsIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { SyncPanel } from "@/components/SyncPanel";
import { getHomePrefs, setHomePrefs, type HomePrefs } from "@/lib/homePrefs";
import { getProfile, setProfile, type Profile } from "@/lib/profile";
import { colorForName } from "@/lib/colors";
import { Avatar } from "@/components/Avatar";
import { PhotoCropper } from "@/components/PhotoCropper";
import { AvatarStylePicker } from "@/components/AvatarStylePicker";

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

function ProfileSetting() {
  const [prof, setProf] = useState<Profile>(getProfile);
  const [pending, setPending] = useState<File | null>(null);
  const [choosing, setChoosing] = useState(false);
  function save(next: Profile) {
    setProf(next);
    setProfile(next);
  }
  return (
    <div className="flex items-center gap-3">
      {choosing && (
        <AvatarStylePicker
          name={prof.name || "?"}
          color={prof.color ?? undefined}
          hasPhoto={!!prof.photo}
          onCancel={() => setChoosing(false)}
          onColor={(hex) => {
            save({ ...prof, color: hex, photo: null });
            setChoosing(false);
          }}
          onFile={(f) => {
            setChoosing(false);
            setPending(f);
          }}
        />
      )}
      {pending && (
        <PhotoCropper
          file={pending}
          onCancel={() => setPending(null)}
          onDone={(dataUrl) => {
            save({ ...prof, photo: dataUrl });
            setPending(null);
          }}
        />
      )}
      <button type="button" className="shrink-0" title="Avatar style" onClick={() => setChoosing(true)}>
        <Avatar
          name={prof.name || "?"}
          color={prof.color || colorForName(prof.name || "?")}
          photo={prof.photo ?? undefined}
          className="h-14 w-14 text-lg"
        />
      </button>
      <div className="flex-1 min-w-0">
        <input
          value={prof.name}
          onChange={(e) => save({ ...prof, name: e.target.value })}
          placeholder="Your player name"
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--muted)]">Golf handicap</span>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={prof.golfHandicap ?? ""}
            onChange={(e) =>
              save({
                ...prof,
                golfHandicap: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="—"
            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm text-center bg-[var(--surface)]"
          />
          <span className="text-[10px] text-[var(--muted)]">auto-fills golf events</span>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Tap the circle to pick your color or add a photo. Everything here auto-loads onto you
          (matched by this name) in tournaments you start, and pre-fills when you join by code.
        </p>
      </div>
      {prof.photo && (
        <button
          type="button"
          onClick={() => save({ ...prof, photo: null })}
          className="text-xs text-[var(--muted)] hover:text-rose-400 shrink-0"
        >
          Remove
        </button>
      )}
    </div>
  );
}

function HomeLayoutSetting() {
  const [prefs, setPrefs] = useState<HomePrefs>(getHomePrefs);
  function toggle(k: keyof HomePrefs) {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    setHomePrefs(next);
  }
  const rows: [keyof HomePrefs, string, string][] = [
    ["banner", "Sports photo banner", "The rotating sports photos at the top of Home."],
    ["join", "Join a live tournament", "The join-by-code card for hopping into live events."],
  ];
  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map(([k, title, desc]) => (
        <button
          key={k}
          type="button"
          onClick={() => toggle(k)}
          className="flex w-full items-center justify-between gap-3 py-3 text-left"
        >
          <span>
            <span className="block text-sm font-medium">{title}</span>
            <span className="block text-xs text-[var(--muted)]">{desc}</span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              prefs[k] ? "bg-[var(--brand)]" : "bg-[var(--border)]"
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                prefs[k] ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
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
          <h2 className="font-semibold">Your profile</h2>
          <p className="text-sm text-[var(--muted)]">Your name and photo, everywhere you play.</p>
        </div>
        <ProfileSetting />
      </Card>

      <Card className="p-5 mt-4 space-y-3">
        <div>
          <h2 className="font-semibold">Appearance</h2>
          <p className="text-sm text-[var(--muted)]">Choose light or dark mode.</p>
        </div>
        <ThemeSetting />
      </Card>

      <div className="mt-4">
        <SyncPanel />
      </div>

      <Card className="p-5 mt-4 space-y-3">
        <div>
          <h2 className="font-semibold">Home layout</h2>
          <p className="text-sm text-[var(--muted)]">Choose what shows on your Home screen.</p>
        </div>
        <HomeLayoutSetting />
      </Card>
    </HydrationGate>
  );
}
