import Link from "next/link";

export const metadata = {
  title: "Support — Sporos",
  description: "Get help with Sporos: contact, FAQs, and troubleshooting.",
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 mb-2 text-lg font-bold">{children}</h2>;
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
        ← Back to Sporos
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Support</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Sporos is made by LewCrew Labs LLC.</p>

      <p className="mt-5 text-[var(--foreground)]">
        Stuck, found a bug, or have an idea? Email{" "}
        <a href="mailto:lewcrewlabsllc@gmail.com" className="text-[var(--brand)] hover:underline">
          lewcrewlabsllc@gmail.com
        </a>{" "}
        and we&apos;ll get back to you — usually within a couple of days.
      </p>

      <H>Common questions</H>
      <ul className="list-disc space-y-3 pl-5 text-[var(--foreground)]">
        <li>
          <b>Where are my tournaments saved?</b> On your device — Sporos works fully offline. They also
          back up to the cloud automatically under a private key, so they survive reinstalls.
        </li>
        <li>
          <b>How do I get my tournaments on a new phone?</b> Sign in with your email in{" "}
          <b>Settings → Account &amp; sync</b>{" "}
          on the old device (if you haven&apos;t already), then sign in
          with the same email on the new one. Your library follows your email.
        </li>
        <li>
          <b>How do friends follow along live?</b> Open your tournament and start a live session — anyone
          with the join code can watch scores update and cheer from their own phone. No app or account
          needed.
        </li>
        <li>
          <b>How do I delete my account?</b> <b>Settings → Account &amp; sync → Delete account</b>. This
          permanently erases your email and every cloud backup from our servers. Details in the{" "}
          <Link href="/privacy" className="text-[var(--brand)] hover:underline">
            privacy policy
          </Link>
          .
        </li>
        <li>
          <b>GPS isn&apos;t finding me on the golf map.</b>{" "}
          Make sure location access is allowed for Sporos
          in your phone&apos;s settings, then tap <b>Locate me</b> again. Indoors, the first fix can take a
          little longer.
        </li>
      </ul>

      <H>Privacy</H>
      <p className="text-[var(--foreground)]">
        Sporos has no ads, no trackers, and never sells your data. Read the full{" "}
        <Link href="/privacy" className="text-[var(--brand)] hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
