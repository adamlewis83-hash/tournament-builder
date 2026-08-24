# Sporos v2 — Plan

**North star:** Sporos is the game-day operating system for your crew. Every v2
pillar deepens group competition — none of it chases the solo-companion apps
(18Birdies, TheGrint) at their own game. We take their three best ideas and
point them at the group.

**Delivery model:** the iOS shell loads the web app, so pillars 1–6 ship the
moment they're pushed. Pillar 7 (the binary) is the one App Store submission,
and it's the marketing moment: new icons, new screenshots, push notifications,
"2.0" release notes.

---

## Pillar 1 — Rounds & the Sporos Handicap  *(the foundation — build first)*

The killer loop: play rounds in Sporos → handicap computed from real scores →
every tournament, cup session, skins pot, and Vegas game gets receipts-backed
net scoring automatically. Nobody sandbags a Sporos event.

- **Quick round**: start a casual round in ~3 taps (course, tees, players) —
  the Traditional engine without the "tournament" ceremony.
- **Auto-saved history**: finished golf rounds land in a per-player Rounds
  history (lives in the Trophy Room, Pillar 3).
- **Sporos Handicap (estimated)**: WHS-style — differential = (score − rating)
  × 113 ÷ slope; index = best 8 of last 20 (scaled for fewer rounds). Rating
  and slope are already stored per tee. Clearly labeled *estimated* (an
  official index requires a licensed club — that's TheGrint's licensing, not
  math we can't do). Auto-fills the handicap field app-wide; manual override
  always available.

**Effort:** engine S (pure math + tests) · UI M. **Depends on:** nothing.

## Pillar 2 — GPS upgrade

- Distances to **front / center / back** of the green (derived from the OSM
  green polygons we already fetch), not just pin-tap distance.
- Bigger, cleaner distance readout; tee-to-green framing; geometry cached with
  saved courses so home courses are instant.
- Honest fallback where OSM lacks green shapes (pin-tap mode, as today).
- **Not promised:** hand-traced hazards/layups for every course — that's a
  paid mapping operation we don't have.

**Effort:** M. **Depends on:** nothing.

## Pillar 3 — Records → the Trophy Room

The retention surface. If it's good, people open Sporos on days they aren't
playing.

- Champions timeline (every event, medal moments)
- **Head-to-head records** ("Adam leads Cory 7–4 all-time"), streaks, medal counts
- Golf: rounds history, scoring averages, **handicap trend chart** (needs P1)
- Visual: podium stays, everything else redesigned

**Effort:** M–L. **Depends on:** P1 for the golf panels; the rest independent.

## Pillar 4 — Mobile polish pass

- Grouped game picker (Classics · Pairs & teams · Side games) instead of the
  11-chip wrap grid
- Tighter setup cards, less scroll-to-the-point
- Scoring screen cleanup — **need Adam's screenshot of the messy scoring view**
- Extends the collapse-and-remember pattern from mobile PR #14

**Effort:** M, spread across screens. **Depends on:** nothing.

## Pillar 5 — Visual overhaul

- New sport icon set (current monoline set reads thin — go bolder/duotone)
- App icon refresh decision: evolve the sprout or keep it (Adam's call)
- Consistency pass across chips, pills, and cards while screens are open

**Effort:** M, design-heavy. Claude drafts SVG sets → Adam picks.
**Depends on:** nothing, but lands best right before the 2.0 submission.

## Pillar 6 — Linked friends & the Activity feed

Friends today are name cards. This makes them connections.

- **Linked friends**: invite by link/QR; both accounts connect (new server
  table keyed by library keys; no passwords, same email-code identity).
- **Activity feed**: "Cory is live at Wasatch — thru 7, +3 · Watch" for any
  linked friend's active event, all sports. Built on the existing live
  sessions + spectator links — the feed is largely surfacing what exists.
- **Privacy first-class**: global "share my activity with friends" toggle,
  per-event private switch. Tournaments default social; solo-round default
  is an open question below.

**Effort:** L (first account-graph feature: schema + API + UI).
**Depends on:** nothing technically; pairs with P7 for push.

## Pillar 7 — The 2.0 binary & store relaunch

- **Push notifications** (APNs + Capacitor push plugin + server sender):
  friend started a tournament, your event went live, cup point swings —
  with per-type notification preferences.
- New **screenshots** (fictional names — demo account is staged and waiting),
  new metadata/keywords, possibly the new app icon, 2.0 release notes.
- Also rides along: Universal Links entitlement (QR codes open the app).

**Effort:** M–L. **The only pillar needing App Store review.**

---

## Suggested sequence

| Wave | Ships | Why this order |
|------|-------|----------------|
| 1 | P1 (handicap engine first — pure math), P4 quick wins, P5 icon drafts | Foundation + visible momentum immediately |
| 2 | P2 GPS, P3 Trophy Room | Both benefit from P1's data; big visible upgrades |
| 3 | P6 friends + feed | The social layer, once there's history worth sharing |
| 4 | P7 binary + relaunch | Bundle everything visible into one "2.0" store moment |

Waves 1–3 are all instant-deploy web work. Nothing waits on Apple until the end.

## Open questions for Adam

1. **Handicap details**: count 9-hole rounds toward the index (WHS combines
   two 9s)? v2.0 could keep it simple: 18s count, 9s stored but not indexed.
2. **Feed privacy default for solo rounds**: visible to friends by default
   (Grint-style) or opt-in per round?
3. **App icon**: evolve the sprout or redesign outright?
4. **Naming**: "Sporos Handicap" or something crew-flavored?
5. Send the **messy scoring screenshot** so P4 targets the right screen.

## Parked (post-v2 candidates)

- Early tee-time alerts (Early Birdies-style) — plan sketched previously
- Shot tracking + FIR/GIR/putts stats (natural v2.1 once Rounds exist)
- Android
