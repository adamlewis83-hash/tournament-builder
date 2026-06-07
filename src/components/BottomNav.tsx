"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Trophy } from "@/components/icons";

const items = [
  { href: "/", label: "Home", Icon: Home, match: (p: string) => p === "/" },
  { href: "/?new=1", label: "New", Icon: Plus, match: () => false },
  { href: "/records", label: "Records", Icon: Trophy, match: (p: string) => p === "/records" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="no-print sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div className="grid grid-cols-3">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-[var(--brand)]" : "text-[var(--muted)]"
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
