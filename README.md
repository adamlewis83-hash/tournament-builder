# Bracket Lab

A local-first tournament builder for any sport. Create round robins, single/double-elimination
brackets, and pool-play tournaments; track wins, losses, and point differential; and crown a champion.

- **Round robin** — rotating partners for doubles, per-player standings, top-N advance to a final
- **Single elimination** — seeded knockout bracket
- **Double elimination** — winners + losers bracket with grand final (and reset)
- **Pool play → bracket** — group stage, then top finishers seed into a knockout

Ties are broken by point differential. Tournaments are saved locally in your browser.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Zustand (persisted to localStorage)

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Bracket/scheduling logic lives in `src/lib`. Quick sanity checks:

```bash
npx tsx scripts/test-bracket.ts   # bracket wiring (single + double elim, byes)
npx tsx scripts/test-flow.ts      # doubles round-robin + finals seeding
```
