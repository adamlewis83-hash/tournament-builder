"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { fetchLibrary, getLibraryKey, setLibraryKey } from "@/lib/library";
import { Cloud } from "@/components/icons";
import { Button, Card } from "./ui";
import { EmailBackup } from "./EmailBackup";

export function SyncPanel() {
  const mergeCloud = useStore((s) => s.mergeCloud);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = getLibraryKey();

  async function recoverKey(k: string) {
    setLibraryKey(k);
    const list = await fetchLibrary(k);
    mergeCloud(list);
    window.location.reload();
  }

  function copy() {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  async function restore() {
    const k = code.trim().toUpperCase();
    if (!k) return;
    setBusy(true);
    const list = await fetchLibrary(k);
    setLibraryKey(k);
    mergeCloud(list);
    window.location.reload();
  }

  return (
    <Card bare className="px-1 mb-6">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <span className="font-semibold flex items-center gap-2">
          <Cloud className="h-4 w-4 text-[var(--brand)]" /> Back up &amp; sync
        </span>
        <span className="text-xs text-[var(--muted)]">
          {open ? "Hide" : "Auto-saved to the cloud · move to a new device"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Your tournaments back up automatically — no login needed. Link an email to restore them
            anywhere, or use the library key directly.
          </p>

          <EmailBackup onRecovered={recoverKey} />

          <div>
            <span className="text-xs font-medium text-[var(--muted)]">Your library key</span>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm font-mono tracking-wider">
                {key}
              </code>
              <Button variant="outline" className="px-3 py-2" onClick={copy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Keep this safe — anyone with it can view &amp; edit your tournaments.
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-[var(--muted)]">Restore on this device</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Paste a library key"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-mono"
              />
              <Button onClick={restore} disabled={!code.trim() || busy}>
                {busy ? "…" : "Restore"}
              </Button>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">Merges that library into this device.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
