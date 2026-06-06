"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home", icon: "🏠", match: (p: string) => p === "/" },
  { href: "/?new=1", label: "New", icon: "➕", match: () => false },
  { href: "/records", label: "Records", icon: "🏆", match: (p: string) => p === "/records" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="no-print sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div className="grid grid-cols-3">
        {items.map((it) => {
          const active = it.match(path);
          return (
            <Link
              key={it.label}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-[var(--brand)]" : "text-[var(--muted)]"
              }`}
            >
              <span className="text-lg leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
