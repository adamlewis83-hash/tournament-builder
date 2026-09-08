"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon, Settings as SettingsIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { HydrationGate } from "@/components/HydrationGate";
import { HandicapImportPanel } from "@/components/HandicapImportPanel";
import { SyncPanel } from "@/components/SyncPanel";
import { FriendLinkPanel } from "@/components/FriendLinkPanel";
import { getHomePrefs, setHomePrefs, type HomePrefs } from "@/lib/homePrefs";
import { getProfile, PROFILE_EVENT, setProfile, type Profile } from "@/lib/profile";
import { seedIndexForPlayer } from "@/lib/handicap";
import { indexInputsFor } from "@/lib/pastRounds";
import { applyAliases, canonicalName } from "@/lib/aliases";
import { SeedIndexCard } from "@/components/SeedIndexCard";
import { useStore } from "@/lib/store";
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
  // The handicap card below writes the same profile — follow it.
  useEffect(() => {
    const sync = () => setProf(getProfile());
    window.addEventListener(PROFILE_EVENT, sync);
    return () => window.removeEventListener(PROFILE_EVENT, sync);
  }, []);
  const [pending, setPending] = useState<File | null>(null);
  const [choosing, setChoosing] = useState(false);
  const tournaments = useStore((s) => s.tournaments);
  function save(next: Profile) {
    setProf(next);
    setProfile(next);
  }
  // While auto-update owns the handicap, the box is a display, not an input —
  // anything typed there would be snapped back after the next round anyway.
  const autoOwnsHandicap =
    prof.seedIndexAuto &&
    !!prof.name.trim() &&
    seedIndexForPlayer(
      applyAliases(tournaments),
      canonicalName(prof.name.trim()),
      indexInputsFor(prof.name.trim()),
    ).index != null;
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
            disabled={autoOwnsHandicap}
            onChange={(e) =>
              save({
                ...prof,
                golfHandicap: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="—"
            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm text-center bg-[var(--surface)] disabled:opacity-60"
          />
          <span className="text-[10px] text-[var(--muted)]">
            {autoOwnsHandicap ? "kept current by your Seed Index" : "auto-fills golf events"}
          </span>
        </div>
        <SeedIndexAdopt prof={prof} save={save} />
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

      {/* The Seed Index lives with the handicap it feeds — this is a setting
          about you, not a trophy. (It also renders on player trophy cases.) */}
      <div className="mt-4">
        <SeedIndexCard />
      </div>

      {/* What the index is built from: the number you arrived with, and any
          rounds from before Sporos. Sits under the index it feeds. */}
      <HandicapImportPanel />

      <Card className="p-5 mt-4 space-y-3">
        <div>
          <h2 className="font-semibold">Your library</h2>
          <p className="text-sm text-[var(--muted)]">Reuse your people and courses across events.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/friends"
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-center font-medium hover:bg-[var(--hover)]"
          >
            👥 Friends
          </Link>
          <Link
            href="/courses"
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-center font-medium hover:bg-[var(--hover)]"
          >
            ⛳ Courses
          </Link>
        </div>
      </Card>

      <Card className="p-5 mt-4 space-y-3">
        <div>
          <h2 className="font-semibold">Appearance</h2>
          <p className="text-sm text-[var(--muted)]">Choose light or dark mode.</p>
        </div>
        <ThemeSetting />
      </Card>

      <FriendLinkPanel />

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

// The Seed Index next to the handicap it feeds. Auto-update is the default:
// finish a round and the handicap that pre-fills your next event already
// moved (SeedIndexSync in the layout does the writing). Turning it off makes
// the handicap yours to type, with a one-tap adopt when you want the index.
function SeedIndexAdopt({ prof, save }: { prof: Profile; save: (p: Profile) => void }) {
  const tournaments = useStore((s) => s.tournaments);
  const name = canonicalName(prof.name.trim());
  if (!name) return null;
  const r = seedIndexForPlayer(applyAliases(tournaments), name, indexInputsFor(name));
  if (r.index == null) return null;
  const current = prof.golfHandicap;
  const same = current != null && Math.abs(current - r.index) < 0.05;
  return (
    <div className="mt-1.5 space-y-1">
      <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <input
          type="checkbox"
          checked={prof.seedIndexAuto}
          onChange={(e) =>
            save({
              ...prof,
              seedIndexAuto: e.target.checked,
              // Turning auto ON adopts the index right away.
              ...(e.target.checked ? { golfHandicap: r.index } : {}),
            })
          }
          className="h-3.5 w-3.5 accent-[var(--brand)]"
        />
        <span>
          Auto-update from my Seed Index{" "}
          <span className="font-semibold text-[var(--foreground)] tabular-nums">
            ({r.index.toFixed(1)}
          </span>
          <span className="tabular-nums">
            {" "}
            from {r.rounds} round{r.rounds === 1 ? "" : "s"})
          </span>
        </span>
      </label>
      {!prof.seedIndexAuto && !same && (
        <p className="text-xs text-[var(--muted)]">
          ⛳ Index says {r.index.toFixed(1)} —{" "}
          <button
            type="button"
            onClick={() => save({ ...prof, golfHandicap: r.index })}
            className="font-semibold text-[var(--brand)] hover:underline"
          >
            use it once
          </button>
        </p>
      )}
    </div>
  );
}
