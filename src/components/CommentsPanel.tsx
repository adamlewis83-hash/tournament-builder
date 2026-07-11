"use client";

import { useEffect, useRef, useState } from "react";
import { Tournament } from "@/lib/types";
import { useLiveComments } from "@/hooks/useLiveComments";
import { getProfile } from "@/lib/profile";
import { Avatar } from "./Avatar";
import { EmojiPicker } from "./EmojiPicker";
import { Button, Card } from "./ui";

const EMOJI = ["👏", "🔥", "🎉", "💪", "🙌", "😤", "⚡", "🏆"];
const NAME_KEY = "seeded-cheer-name";
const MANUAL_KEY = "seeded-cheer-name-manual"; // set once the user deliberately picks a cheer name

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
function hue(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 45%)`;
}

export function CommentsPanel({ t }: { t: Tournament }) {
  const { comments, post } = useLiveComments(t.liveCode);
  const [name, setName] = useState<string>("");
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [text, setText] = useState("");
  const [tag, setTag] = useState(""); // "" | "player:Adam" | "hole:7"
  const [showEmoji, setShowEmoji] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Your profile name is your identity by default — so joining a tournament cheers as
    // the real you, not a stale name left over from testing. A name you deliberately pick
    // (the "change" flow) is remembered and wins over the profile default.
    const prof = getProfile();
    const nm = prof.name.trim();
    const manual = localStorage.getItem(MANUAL_KEY) === "1";
    const saved = localStorage.getItem(NAME_KEY) ?? "";
    setProfileName(nm);
    setProfilePhoto(prof.photo);
    setName(manual && saved ? saved : nm || saved);
    setDraftName(nm);
  }, []);

  // Comments only carry a name over the wire, so resolve each author's avatar from the
  // roster (host-set or self-registered photos/colors) and fall back to your own profile
  // photo for your own cheers. No per-comment photo needed on the server.
  const byName = new Map<string, { photo?: string; color?: string }>();
  for (const p of t.participants) {
    const k = p.name.trim().toLowerCase();
    if (!byName.has(k)) byName.set(k, { photo: p.photo, color: p.color });
  }
  const authorPhoto = (a: string): string | undefined => {
    const k = a.trim().toLowerCase();
    return byName.get(k)?.photo ?? (k === profileName.toLowerCase() ? profilePhoto ?? undefined : undefined);
  };
  const authorColor = (a: string): string => byName.get(a.trim().toLowerCase())?.color ?? hue(a);
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  function saveName(n: string) {
    const v = n.trim().slice(0, 40);
    if (!v) return;
    localStorage.setItem(NAME_KEY, v);
    // Deliberately choosing a name (that isn't just your profile) pins it over the profile default.
    if (v.toLowerCase() === profileName.toLowerCase()) localStorage.removeItem(MANUAL_KEY);
    else localStorage.setItem(MANUAL_KEY, "1");
    setName(v);
  }

  function send() {
    const body = text.trim();
    if (!body || !name) return;
    let targetType: string | null = null;
    let targetLabel: string | null = null;
    if (tag.startsWith("player:")) {
      targetType = "player";
      targetLabel = tag.slice(7);
    } else if (tag.startsWith("hole:")) {
      targetType = "hole";
      targetLabel = `Hole ${tag.slice(5)}`;
    }
    post({ author: name, text: body, targetType, targetLabel });
    setText("");
  }

  const holes = t.golf?.holes ?? t.ryderGolf?.holes ?? 0;

  return (
    <Card className="no-print p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <h2 className="font-bold text-sm flex items-center gap-1.5">
          Cheers <span className="text-base">💬</span>
        </h2>
        {name && (
          <button
            onClick={() => setName("")}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            cheering as <span className="font-semibold text-[var(--foreground)]">{name}</span> · change
          </button>
        )}
      </div>

      {/* Feed */}
      <div ref={feedRef} className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-4">
            No cheers yet — be the first to hype the group. 📣
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <Avatar
                name={c.author}
                color={authorColor(c.author)}
                photo={authorPhoto(c.author)}
                className="h-7 w-7 text-[11px] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{c.author}</span>
                  {c.targetLabel && (
                    <span className="text-[11px] rounded-full bg-[var(--brand-soft)] text-[var(--brand)] px-1.5 py-0.5 font-medium">
                      {c.targetType === "hole" ? "⛳ " : "@ "}
                      {c.targetLabel}
                    </span>
                  )}
                  <span className="text-[11px] text-[var(--muted)]">{ago(c.createdAt)}</span>
                </div>
                <p className="text-sm break-words">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer / identity */}
      <div className="border-t border-[var(--border)] p-3">
        {!name ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--muted)]">Join the cheers as…</p>
            {profileName && (
              <button
                onClick={() => saveName(profileName)}
                className="rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]"
              >
                {profileName} (you)
              </button>
            )}
            <div className="flex flex-wrap gap-1.5">
              {t.participants
                .filter((p) => p.name.toLowerCase() !== profileName.toLowerCase())
                .slice(0, 12)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => saveName(p.name)}
                    className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs hover:bg-[var(--hover)]"
                  >
                    {p.name}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName(draftName)}
                placeholder="or type your name (e.g. Grandma)"
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm bg-[var(--surface)]"
              />
              <Button className="px-3 py-1.5" onClick={() => saveName(draftName)} disabled={!draftName.trim()}>
                Set
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 relative">
            {showEmoji && (
              <div className="absolute bottom-full left-0 mb-2 z-20">
                <EmojiPicker
                  onPick={(e) => setText((t2) => (t2 + " " + e).trimStart())}
                  onClose={() => setShowEmoji(false)}
                />
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => setText((t2) => (t2 + " " + e).trimStart())}
                  className="text-lg leading-none hover:scale-125 transition"
                  aria-label={`Add ${e}`}
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                aria-label="More emoji"
                title="More emoji"
                className={`rounded-full border px-2 py-0.5 text-xs font-medium transition ${
                  showEmoji
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]"
                }`}
              >
                😀＋
              </button>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="ml-auto rounded-lg border border-[var(--border)] px-2 py-1 text-xs bg-[var(--surface)] max-w-[45%]"
              >
                <option value="">Tag (optional)</option>
                {t.participants.map((p) => (
                  <option key={p.id} value={`player:${p.name}`}>
                    {p.name}
                  </option>
                ))}
                {holes > 0 &&
                  Array.from({ length: holes }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={`hole:${h}`}>
                      Hole {h}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Cheer them on… 🔥"
                maxLength={280}
                className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-[var(--surface)]"
              />
              <Button className="px-4 py-2" onClick={send} disabled={!text.trim()}>
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
