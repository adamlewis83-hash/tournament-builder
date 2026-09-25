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
  // Safari's Smart App Banner: OPEN when Sporos is installed, GET when it
  // isn't, and it hands the app this exact link so the round opens there.
  const itunes = {
    appId: "6787539978",
    appArgument: `https://sporos.app/live/${encodeURIComponent(code.toUpperCase())}`,
  };
  try {
    const live = await prisma.liveTournament.findUnique({
      where: { code: code.toUpperCase() },
    });
    const t = live?.data as { name?: string; sport?: string; participants?: unknown[] } | null;
    if (t?.name) {
      const title = `${t.name} — live on Sporos`;
      const description = `${t.sport ?? "Tournament"} · ${t.participants?.length ?? 0} playing. Watch it live, or jump in and keep score.`;
      return { title, description, openGraph: { title, description }, itunes };
    }
  } catch {
    /* DB hiccup — fall back to the site-wide card */
  }
  return {
    title: "Watch live — Sporos",
    description: "Follow this tournament's scores live.",
    itunes,
  };
}

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
