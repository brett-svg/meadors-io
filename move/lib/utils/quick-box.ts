import { suggestRoomCode } from "@/lib/auth/room-code";

type QuickDefaults = {
  house: string;
  floor: string;
  priority: "low" | "medium" | "high";
  status: "draft" | "packed" | "in_transit" | "delivered" | "unpacked";
  fragile: boolean;
};

const BASE_DEFAULTS: QuickDefaults = {
  house: "Main House",
  floor: "Main",
  priority: "medium",
  status: "draft",
  fragile: false
};

export function buildQuickBoxPayload(room: string, defaults: Partial<QuickDefaults> = {}) {
  const normalizedRoom = room.trim() || "Room";
  const merged = { ...BASE_DEFAULTS, ...defaults };
  return {
    house: merged.house,
    floor: merged.floor,
    room: normalizedRoom,
    roomCode: suggestRoomCode(normalizedRoom),
    priority: merged.priority,
    status: merged.status,
    fragile: merged.fragile
  };
}
