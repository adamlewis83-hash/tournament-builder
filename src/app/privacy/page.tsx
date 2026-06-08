import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Sporos",
  description: "How Sporos handles your data.",
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 mb-2 text-lg font-bold">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-4">
      <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
        ← Back to Sporos
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Last updated: June 2026</p>

      <p className="mt-5 text-[var(--foreground)]">
        Sporos is a tournament organizer and live-scoring app operated by LewCrew Labs. We built it to
        be private by default: your data lives on your device, and we collect as little as possible.
        This policy explains what we store, why, and your choices. There are no accounts, passwords,
        ads, or trackers, and we never sell your data.
      </p>

      <H>What we store</H>
      <ul className="list-disc space-y-2 pl-5 text-[var(--foreground)]">
        <li>
          <b>On your device.</b> Your tournaments — names, players, scores, settings — are saved in your
          browser/app storage so the app works offline. This stays on your device unless you back it up.
        </li>
        <li>
          <b>Cloud backup (optional).</b> When backup is on, a copy of your tournaments is saved to our
          database under a random, private &quot;library key&quot; generated on your device — no login required.
        </li>
        <li>
          <b>Email (optional).</b> If you set up email recovery, we store your email address linked to
          your library key, plus a short-lived one-time code, so you can restore your tournaments on a
          new device. No password is ever stored.
        </li>
        <li>
          <b>Live sessions.</b> If you make a tournament &quot;live,&quot; its current data is shared via a join
          code so others can follow along. Any <b>cheers/comments</b> you or spectators post (with the
          display name you choose) are stored for that session.
        </li>
      </ul>

      <H>What we don&apos;t do</H>
      <ul className="list-disc space-y-2 pl-5 text-[var(--foreground)]">
        <li>No advertising and no ad networks.</li>
        <li>No selling or renting of your data to anyone.</li>
        <li>No third-party analytics or cross-site tracking.</li>
        <li>No collection of location, contacts, or device identifiers.</li>
      </ul>

      <H>Service providers</H>
      <p className="text-[var(--foreground)]">We use a few providers strictly to run the app:</p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-[var(--foreground)]">
        <li>
          <b>Vercel</b> (hosting) and <b>Neon</b> (database) — store backups, live sessions, and email
          recovery links described above.
        </li>
        <li>
          <b>Resend</b> — sends the one-time recovery codes to your email.
        </li>
        <li>
          <b>Unsplash</b> — supplies the background photos on the home screen (no personal data is sent).
        </li>
      </ul>

      <H>Retention &amp; deletion</H>
      <p className="text-[var(--foreground)]">
        Local data stays until you delete a tournament or clear app storage. Cloud backups remain until
        you delete the tournament or stop backing up. Live sessions and their cheers persist with the
        session. To delete your cloud data or email link, or to request removal, email us and we&apos;ll take
        care of it.
      </p>

      <H>Children</H>
      <p className="text-[var(--foreground)]">
        Sporos isn&apos;t directed at children under 13, and we don&apos;t knowingly collect their personal
        information. Player names entered by an organizer are free-text and not tied to an identity.
      </p>

      <H>Changes</H>
      <p className="text-[var(--foreground)]">
        If we update this policy, we&apos;ll change the date above and post the new version here.
      </p>

      <H>Contact</H>
      <p className="text-[var(--foreground)]">
        Questions or requests? Email{" "}
        <a href="mailto:lewcrewlabs@gmail.com" className="text-[var(--brand)] hover:underline">
          lewcrewlabs@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
