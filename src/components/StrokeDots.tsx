// Amber dots showing how many handicap strokes a player gets on a hole.
// Always renders the fixed-height spacer so table rows stay aligned at n=0.
export function StrokeDots({ n }: { n: number }) {
  return (
    <div className="flex h-1.5 items-center justify-center gap-0.5">
      {Array.from({ length: Math.max(0, n) }).map((_, i) => (
        <span key={i} className="h-1 w-1 rounded-full bg-amber-400" />
      ))}
    </div>
  );
}
