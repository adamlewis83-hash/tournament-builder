"use client";

import { useState } from "react";

// The app's one way to explain itself: a small ? that unfolds a plain-words
// panel right where the question arises. Same look everywhere (Rounds, Custom,
// Trophy Room pioneered it) so a ? always means "tap me and this makes sense".
export function InfoTip({
  label,
  title,
  children,
  className,
}: {
  label: string; // aria-label, e.g. "How cup scoring works"
  title?: string; // bold first line of the panel
  children: React.ReactNode; // the explanation (text, list items…)
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className={className}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={`grid h-4.5 w-4.5 place-items-center rounded-full border text-[10px] font-bold transition ${
          open
            ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
            : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        ?
      </button>
      {open && (
        <div className="mt-1.5 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand-soft)]/40 px-3.5 py-2.5 text-left text-xs font-normal leading-relaxed text-[var(--muted)] normal-case tracking-normal">
          {title && <p className="mb-1 font-semibold text-[var(--foreground)]">{title}</p>}
          {children}
        </div>
      )}
    </span>
  );
}
