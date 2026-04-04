// Hebrew niqqud (vowel marks) range
const NIQQUD_REGEX = /[\u0591-\u05C7]/g;
// Hebrew geresh (׳), gershayim (״), and ASCII quotes used as gershayim in acronyms
// e.g. תנ"ך / תנ״ך / תנך should all normalize to תנך
const GERSHAYIM_REGEX = /[\u05F3\u05F4"'`]/g;

export function normalizeWord(raw: string): string {
  return raw
    .trim()
    .replace(NIQQUD_REGEX, "")
    .replace(GERSHAYIM_REGEX, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isValidWord(word: string): boolean {
  const normalized = normalizeWord(word);
  return normalized.length >= 1 && normalized.length <= 50;
}

export function generateGameCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Neon card colors — each player gets one
export const PLAYER_COLORS = [
  "#FF3D5A", // neon red
  "#00B4FF", // neon blue
  "#FFE02E", // punchy yellow
  "#00C853", // neon green
  "#FF2D78", // hot pink
  "#FF8C42", // bright orange
  "#00E5FF", // neon teal
  "#B24EFF", // electric purple
] as const;

// Get a player's persistent color based on their join order
export function getPlayerColor(playerIndex: number): string {
  return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
}

// Build a map of playerId → color based on sorted player list
export function buildPlayerColorMap(players: { id: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  players.forEach((p, i) => {
    map.set(p.id, getPlayerColor(i));
  });
  return map;
}
