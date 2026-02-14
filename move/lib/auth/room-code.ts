const roomMap: Record<string, string> = {
  kitchen: "KIT",
  "primary bedroom": "PB",
  bedroom: "BR",
  "guest bedroom": "GB",
  bathroom: "BA",
  "living room": "LR",
  "dining room": "DR",
  office: "OFC",
  garage: "GAR",
  laundry: "LND",
  basement: "BSMT",
  attic: "ATC",
  closet: "CL",
  pantry: "PAN",
  hallway: "HALL",
  entryway: "ENT",
  playroom: "PLAY",
  storage: "STOR",
  patio: "PAT",
  balcony: "BAL",
  shed: "SHED"
};

export function suggestRoomCode(room: string, existingCodes: string[] = []) {
  const normalized = room.trim().toLowerCase();
  let base = roomMap[normalized];

  if (!base) {
    const words = room
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (words.length > 1) {
      base = words.map((w) => w[0].toUpperCase()).join("").slice(0, 5);
    } else {
      base = words[0]?.slice(0, 5).toUpperCase() || "RM";
    }
    if (base.length < 2) {
      base = (words[0] || "ROOM").slice(0, 3).toUpperCase();
    }
  }

  let candidate = base;
  let n = 2;
  const set = new Set(existingCodes.map((c) => c.toUpperCase()));
  while (set.has(candidate.toUpperCase())) {
    candidate = `${base}${n}`;
    n += 1;
  }
  return candidate.slice(0, 5);
}
