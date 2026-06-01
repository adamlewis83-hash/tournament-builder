export function uid(): string {
  // Prefer crypto when available (browser + modern node), fall back to random.
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
