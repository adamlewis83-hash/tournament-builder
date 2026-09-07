import type { Metadata } from "next";

// Safari's Smart App Banner, scoped to invite links. A texted invite lands in
// a browser whenever the app isn't installed (and, until iOS refetches the
// app-site-association file, even when it is). The banner is the one thing
// that reads the device correctly on its own: OPEN when Sporos is installed,
// GET when it isn't, and it hands the app this exact invite URL so the link
// finishes on the account the person actually plays on.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    itunes: {
      appId: "6787539978",
      appArgument: `https://sporos.app/f/${encodeURIComponent(code.toUpperCase())}`,
    },
  };
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
