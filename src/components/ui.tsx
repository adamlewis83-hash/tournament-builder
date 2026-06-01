"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS: Record<string, string> = {
  primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)] border-transparent",
  accent: "bg-[var(--accent)] text-white hover:brightness-95 border-transparent",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-slate-100 border-transparent",
  outline: "bg-[var(--surface)] text-[var(--foreground)] hover:bg-slate-50 border-[var(--border)]",
  danger: "bg-transparent text-red-600 hover:bg-red-50 border-transparent",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-[var(--surface)] shadow-sm ${className}`}>{children}</div>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}
