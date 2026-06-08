const RULES: [RegExp, string][] = [
  [/ping|table tennis/i, "🏓"],
  [/pickle/i, "🏓"],
  [/tennis/i, "🎾"],
  [/basket/i, "🏀"],
  [/flag football|american football|gridiron/i, "🏈"],
  [/soccer|football/i, "⚽"],
  [/golf/i, "⛳"],
  [/disc/i, "🥏"],
  [/foos|pool|billiard/i, "🎱"],
  [/corn/i, "🌽"],
  [/bowl/i, "🎳"],
  [/volley/i, "🏐"],
  [/dart/i, "🎯"],
  [/chess/i, "♟️"],
  [/video|esport|game/i, "🎮"],
  [/board/i, "🎲"],
  [/beer|spike/i, "🍺"],
  [/badmin/i, "🏸"],
  [/racquet|squash/i, "🥎"],
  [/pop-?a-?shot|hoop/i, "🏀"],
  [/cook|chili|bbq|food/i, "🍳"],
];

export function sportEmoji(sport: string): string {
  for (const [re, emoji] of RULES) if (re.test(sport)) return emoji;
  return "🏆";
}
