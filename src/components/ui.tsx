"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] text-[var(--on-brand)] font-semibold hover:brightness-110 border-transparent shadow-[0_6px_24px_-8px_var(--glow)]",
  accent:
    "bg-[var(--brand-strong)] text-[var(--on-brand)] font-semibold hover:brightness-110 border-transparent",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--hover)] border-transparent",
  outline:
    "bg-[var(--hover)] text-[var(--foreground)] hover:bg-[var(--hover-strong)] border-[var(--border)]",
  danger: "bg-transparent text-rose-500 hover:bg-rose-500/10 border-transparent",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  bare = false,
}: {
  children: ReactNode;
  className?: string;
  bare?: boolean;
}) {
  return (
    <div className={`${bare ? "rounded-2xl" : "glass rounded-2xl shadow-xl shadow-black/20"} ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  const map: Record<string, string> = {
    slate: "bg-[var(--subtle)] text-[var(--muted)] border border-[var(--border)]",
    blue: "bg-sky-500/15 text-sky-600 border border-sky-500/30",
    green: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
    purple: "bg-violet-500/15 text-violet-600 border border-violet-500/30",
    rose: "bg-rose-500/15 text-rose-600 border border-rose-500/30",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}
