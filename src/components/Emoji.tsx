// Render an emoji as a crisp, consistent Twemoji SVG (same on every device).
function twemojiUrl(emoji: string): string {
  const cps = [...emoji]
    .map((c) => c.codePointAt(0)!)
    .filter((c) => c !== 0xfe0f) // strip variation selector (matches Twemoji filenames)
    .map((c) => c.toString(16))
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cps}.svg`;
}

export function Emoji({
  e,
  className = "h-5 w-5",
  title,
}: {
  e: string;
  className?: string;
  title?: string;
}) {
  return (
    <img
      src={twemojiUrl(e)}
      alt={e}
      title={title ?? e}
      draggable={false}
      loading="lazy"
      className={`inline-block align-[-0.15em] ${className}`}
    />
  );
}
