"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchLive, registerPlayer } from "@/lib/live";
import { getProfile } from "@/lib/profile";
import { PhotoCropper } from "@/components/PhotoCropper";
import { Button, Card } from "@/components/ui";
import { Tournament } from "@/lib/types";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || "").toUpperCase();

  const [tourney, setTourney] = useState<Tournament | null | undefined>(undefined); // undefined = loading
  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!code) return;
    fetchLive(code).then((s) => setTourney(s ? (s.data as Tournament) : null));
  }, [code]);

  // Pre-fill from the saved profile (Settings → Your profile) — after mount to
  // keep server and first client render identical.
  useEffect(() => {
    const prof = getProfile();
    if (prof.name) setName((n) => n || prof.name);
    if (prof.photo) setPhoto((p) => p || prof.photo);
  }, []);

  const isGolf = tourney?.format === "golf";

  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPendingPhoto(f);
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr("");
    const r = await registerPlayer(code, {
      name: name.trim(),
      handicap: handicap === "" ? null : Number(handicap),
      photo,
    });
    setBusy(false);
    if (r) setDone(true);
    else setErr("Couldn't join — check the code and try again.");
  }

  function addAnother() {
    setName("");
    setHandicap("");
    setPhoto(null);
    setDone(false);
  }

  if (tourney === undefined)
    return <Card className="p-6 text-center text-[var(--muted)] max-w-md mx-auto">Loading…</Card>;

  if (tourney === null)
    return (
      <Card className="p-6 text-center max-w-md mx-auto">
        <p className="font-semibold">Tournament not found</p>
        <p className="text-sm text-[var(--muted)] mt-1">
          Double-check the code <span className="font-mono font-bold">{code}</span> with the host.
        </p>
      </Card>
    );

  if (done)
    return (
      <Card className="p-6 text-center space-y-3 max-w-md mx-auto">
        <div className="text-5xl">✅</div>
        <p className="font-semibold text-lg">You&apos;re in!</p>
        <p className="text-sm text-[var(--muted)]">
          You joined <b>{tourney.name}</b>. The host will kick things off once everyone&apos;s
          registered.
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={addAnother} variant="outline">
            Add another player
          </Button>
          <Link href={`/live/${code}`} className="text-sm text-[var(--brand)] hover:underline">
            Watch it live →
          </Link>
        </div>
      </Card>
    );

  return (
    <Card className="p-6 space-y-4 max-w-md mx-auto">
      {pendingPhoto && (
        <PhotoCropper
          file={pendingPhoto}
          onCancel={() => setPendingPhoto(null)}
          onDone={(dataUrl) => {
            setPhoto(dataUrl);
            setPendingPhoto(null);
          }}
        />
      )}
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)] font-bold">
          Join tournament
        </p>
        <h1 className="text-2xl font-display font-bold">{tourney.name}</h1>
        <p className="text-sm text-[var(--muted)]">{tourney.sport}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--surface)]"
            placeholder="e.g. Adam L"
          />
        </label>

        {isGolf && (
          <label className="block">
            <span className="text-sm font-medium">
              Handicap <span className="text-[var(--muted)]">(optional)</span>
            </span>
            <input
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
              inputMode="decimal"
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--surface)]"
              placeholder="e.g. 12"
            />
          </label>
        )}

        <div>
          <span className="text-sm font-medium">
            Photo <span className="text-[var(--muted)]">(optional)</span>
          </span>
          <div className="mt-1 flex items-center gap-3">
            <label className="cursor-pointer shrink-0">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt="your photo"
                  className="h-16 w-16 rounded-full object-cover ring-1 ring-black/15"
                />
              ) : (
                <span className="h-16 w-16 rounded-full bg-[var(--subtle)] grid place-items-center text-[var(--muted)] text-2xl">
                  ＋
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={onPhoto}
              />
            </label>
            <span className="text-sm text-[var(--muted)]">
              {photo ? "Tap to change" : "So others recognize you"}
            </span>
          </div>
        </div>

        {err && <p className="text-sm text-red-500">{err}</p>}

        <Button type="submit" disabled={!name.trim() || busy} className="w-full">
          {busy ? "Joining…" : "Join tournament →"}
        </Button>
      </form>
    </Card>
  );
}
