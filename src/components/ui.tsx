"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

const VARIANTS: Record<string, string> = {
  primary:
    "bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 font-semibold hover:brightness-110 border-transparent shadow-[0_6px_24px_-8px_rgba(34,211,238,0.6)]",
  accent: "bg-lime-400 text-slate-950 font-semibold hover:brightness-110 border-transparent",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-white/5 border-transparent",
  outline: "bg-white/5 text-[var(--foreground)] hover:bg-white/10 border-[var(--border)]",
  danger: "bg-transparent text-rose-400 hover:bg-rose-500/10 border-transparent",
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

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl shadow-xl shadow-black/20 ${className}`}>{children}</div>;
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  const map: Record<string, string> = {
    slate: "bg-white/8 text-slate-200 border border-white/10",
    blue: "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30",
    green: "bg-lime-400/15 text-lime-300 border border-lime-400/30",
    amber: "bg-amber-400/15 text-amber-300 border border-amber-400/30",
    purple: "bg-indigo-400/15 text-indigo-300 border border-indigo-400/30",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}
