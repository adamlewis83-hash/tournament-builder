// Marketing showcase: the app "in action" across a phone, tablet, and laptop.
// Pure CSS/JSX mock UIs (theme-aware) — no screenshots to capture or maintain.

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c }} />;
}

function Avatar({ l, c }: { l: string; c: string }) {
  return (
    <span
      className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white"
      style={{ background: c }}
    >
      {l}
    </span>
  );
}

/* ---- Phone: live scoreboard ---- */
function Phone() {
  return (
    <div className="relative w-[190px] shrink-0 rounded-[1.9rem] bg-slate-900 p-1.5 shadow-2xl ring-1 ring-white/15">
      <div className="absolute left-1/2 top-2 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/25" />
      <div className="aspect-[9/18.5] overflow-hidden rounded-[1.45rem] bg-[var(--surface)]">
        <div className="px-3 pb-3 pt-6 text-[10px] leading-tight">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 font-bold text-rose-500">
              <Dot c="#f43f5e" /> LIVE
            </span>
            <span className="text-[var(--muted)]">Court 1</span>
          </div>
          <div className="mt-2 text-[11px] font-bold">Pickleball Night</div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <Avatar l="N" c="#16a34a" /> Net Ninjas
              </span>
              <span className="text-sm font-extrabold tabular-nums">21</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <Avatar l="S" c="#f43f5e" /> Smash Bros
              </span>
              <span className="text-sm font-extrabold tabular-nums text-[var(--muted)]">18</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--subtle)]">
            <div className="h-full w-[62%] rounded-full bg-emerald-500" />
          </div>
          <div className="mt-3 space-y-1.5 text-[var(--muted)]">
            {["Dink Dynasty 15", "Paddle Pirates 11"].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-md bg-[var(--subtle)] px-2 py-1">
                <span>{r.split(" ").slice(0, -1).join(" ")}</span>
                <span className="font-semibold tabular-nums text-[var(--foreground)]">{r.split(" ").pop()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Tablet: cheer feed ---- */
function Tablet() {
  const cheers = [
    { a: "Adam", c: "#16a34a", t: "Net Ninjas take it! 🔥", tag: "@ Cody" },
    { a: "Grandma", c: "#a855f7", t: "Go team!! 🎉" },
    { a: "Tom", c: "#0ea5e9", t: "What a rally 👏" },
  ];
  return (
    <div className="w-[210px] shrink-0 rounded-2xl bg-slate-900 p-1.5 shadow-2xl ring-1 ring-white/15">
      <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[var(--surface)]">
        <div className="p-3 text-[10px]">
          <div className="mb-2 flex items-center gap-1 text-[11px] font-bold">Cheers 💬</div>
          <div className="space-y-2.5">
            {cheers.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <Avatar l={c.a[0]} c={c.c} />
                <div>
                  <div className="font-semibold">
                    {c.a}{" "}
                    {c.tag && (
                      <span className="rounded bg-[var(--brand-soft)] px-1 text-[8px] font-medium text-[var(--brand)]">
                        {c.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-[var(--muted)]">{c.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Laptop: standings ---- */
function Laptop() {
  const rows = [
    ["1", "Net Ninjas", "3–0", "#16a34a"],
    ["2", "Dink Dynasty", "2–1", "#0ea5e9"],
    ["3", "Smash Bros", "1–2", "#f59e0b"],
    ["4", "Paddle Pirates", "0–3", "#a855f7"],
  ];
  return (
    <div className="w-[340px] shrink-0">
      <div className="overflow-hidden rounded-t-xl border-4 border-slate-900 bg-[var(--surface)] shadow-2xl ring-1 ring-white/15">
        <div className="aspect-[16/10] p-3 text-[10px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold">Standings</span>
            <span className="rounded-full bg-[var(--brand-soft)] px-1.5 py-0.5 text-[8px] font-semibold text-[var(--brand)]">
              Round Robin
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            {rows.map(([r, name, rec, color], i) => (
              <div
                key={r}
                className={`flex items-center gap-2 px-2 py-1.5 ${i === 0 ? "bg-[var(--brand-soft)]" : ""} ${i > 0 ? "border-t border-[var(--border)]" : ""}`}
              >
                <span className="w-3 font-bold text-[var(--muted)]">{r}</span>
                <Avatar l={name[0]} c={color} />
                <span className="flex-1 font-semibold">{name}</span>
                <span className="tabular-nums text-[var(--muted)]">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* base */}
      <div className="h-2.5 rounded-b-md bg-slate-900" />
      <div className="mx-auto h-1.5 w-2/5 rounded-b-lg bg-slate-700" />
    </div>
  );
}

export function DeviceShowcase() {
  return (
    <section className="relative z-10 mt-16 mb-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-bold">Score it live — on every screen</h2>
        <p className="mt-2 text-[var(--muted)] max-w-lg mx-auto">
          Run it from a laptop, follow along on a tablet, score from your phone on the court — everyone
          stays in sync, and the gallery can cheer from anywhere.
        </p>
      </div>
      <div className="relative mt-10">
        {/* Soft branded glow so the devices read as a hero moment, not a footnote. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[120%] w-[min(680px,90%)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--brand-soft), transparent 75%)",
          }}
        />
        <div className="flex flex-wrap items-end justify-center gap-7 sm:gap-10">
          <div className="flex flex-col items-center gap-2 animate-float" style={{ animationDelay: "0s" }}>
            <Laptop />
            <span className="text-xs font-medium text-[var(--muted)]">On the big screen</span>
          </div>
          <div className="flex flex-col items-center gap-2 animate-float" style={{ animationDelay: "0.5s" }}>
            <Phone />
            <span className="text-xs font-medium text-[var(--muted)]">Score from your phone</span>
          </div>
          <div className="flex flex-col items-center gap-2 animate-float" style={{ animationDelay: "1s" }}>
            <Tablet />
            <span className="text-xs font-medium text-[var(--muted)]">Cheer from the sidelines</span>
          </div>
        </div>
      </div>
    </section>
  );
}
