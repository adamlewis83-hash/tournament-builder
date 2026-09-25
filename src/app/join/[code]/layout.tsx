import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// The join QR/link lands here — the preview should carry the event's name so
// a texted invite reads like an invitation, not a URL.
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
    appArgument: `https://sporos.app/join/${encodeURIComponent(code.toUpperCase())}`,
  };
  try {
    const live = await prisma.liveTournament.findUnique({
      where: { code: code.toUpperCase() },
    });
    const t = live?.data as { name?: string; sport?: string } | null;
    if (t?.name) {
      const title = `Join ${t.name} — Sporos`;
      const description = `${t.sport ?? "Tournament"} · add yourself with one tap and follow the scores live.`;
      return { title, description, openGraph: { title, description }, itunes };
    }
  } catch {
    /* fall back to the site-wide card */
  }
  return {
    title: "Join a tournament — Sporos",
    description: "Add yourself to the roster and follow the scores live.",
    itunes,
  };
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
