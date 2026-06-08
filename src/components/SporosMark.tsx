// Sporos logo mark: a tournament BRACKET (foundation) → stem & leaves (growth) → crown (champion).
// Uses currentColor so it inherits its surroundings (cream on green in the header, etc.).
export function SporosMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      {/* crown */}
      <path
        d="M8.7 6.3 L9.3 3.9 L10.85 5.1 L12 2.6 L13.15 5.1 L14.7 3.9 L15.3 6.3 Z"
        fill="currentColor"
      />
      <circle cx="9.3" cy="3.5" r="0.85" fill="currentColor" />
      <circle cx="12" cy="2.2" r="0.95" fill="currentColor" />
      <circle cx="14.7" cy="3.5" r="0.85" fill="currentColor" />
      {/* stem */}
      <path d="M12 6.3 V 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      {/* leaves */}
      <path
        d="M12 10.8 C 13.5 9.3 15.6 8.8 16.9 7.7 C 16.1 9.8 14.4 11.1 12 11.1 Z"
        fill="currentColor"
      />
      <path
        d="M12 10.8 C 10.5 9.3 8.4 8.8 7.1 7.7 C 7.9 9.8 9.6 11.1 12 11.1 Z"
        fill="currentColor"
      />
      {/* roots drawn as a tournament bracket converging to a champion */}
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M6.8 16 H 17.2" />
        <path d="M6.8 16 V 18.4 H 10.7" />
        <path d="M17.2 16 V 18.4 H 13.3" />
        <path d="M12 16 V 19.4" />
        <path d="M10.4 21.2 L 12 19.4 L 13.6 21.2" />
      </g>
    </svg>
  );
}
