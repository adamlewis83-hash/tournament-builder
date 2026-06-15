function luminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length < 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function initials(name: string): string {
  const parts = name.split(/[\s/&]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase().slice(0, 2) || "?";
}

/** A circular avatar: the player's photo if they have one, else initials in their color. */
export function Avatar({
  name,
  color,
  photo,
  className = "h-7 w-7 text-[11px]",
}: {
  name: string;
  color: string;
  photo?: string;
  className?: string;
}) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className={`inline-block rounded-full object-cover ring-1 ring-black/15 shrink-0 ${className}`}
      />
    );
  }
  const dark = luminance(color) > 0.62;
  return (
    <span
      style={{ background: color }}
      className={`inline-flex items-center justify-center rounded-full font-bold ring-1 ring-black/15 shrink-0 ${
        dark ? "text-black/80" : "text-white"
      } ${className}`}
    >
      {initials(name)}
    </span>
  );
}
