import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// A texted live link is Sporos's most-shared URL — its preview card should
// sell the moment ("watch Labor Day '26 live"), not read as a bare domain.
// Metadata renders server-side, so the live blob is read straight from the DB.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  try {
    const live = await prisma.liveTournament.findUnique({
      where: { code: code.toUpperCase() },
    });
    const t = live?.data as { name?: string; sport?: string; participants?: unknown[] } | null;
    if (t?.name) {
      const title = `${t.name} — live on Sporos`;
      const description = `${t.sport ?? "Tournament"} · ${t.participants?.length ?? 0} playing. Follow the scores live — no app needed.`;
      return { title, description, openGraph: { title, description } };
    }
  } catch {
    /* DB hiccup — fall back to the site-wide card */
  }
  return {
    title: "Watch live — Sporos",
    description: "Follow this tournament's scores live.",
  };
}

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
