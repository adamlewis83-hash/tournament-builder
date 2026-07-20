"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Cards, Trophy, Settings } from "@/components/icons";

const items = [
  { href: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
  { href: "/new", label: "New", Icon: Plus, match: (p: string) => p === "/new" },
  {
    href: "/tournaments",
    label: "Tournaments",
    Icon: Cards,
    match: (p: string) => p.startsWith("/tournaments") || p.startsWith("/t/"),
  },
  { href: "/records", label: "Records", Icon: Trophy, match: (p: string) => p === "/records" },
  { href: "/settings", label: "Settings", Icon: Settings, match: (p: string) => p === "/settings" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="no-print fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl grid grid-cols-5">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                active ? "text-[var(--brand)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="h-5 w-5" weight={active ? "fill" : "duotone"} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
