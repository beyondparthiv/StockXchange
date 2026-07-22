import type { GameConfig } from "@/lib/game/config";

/** Player counts allowed in a room (per the game rules: 2–6). */
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const ROOM_CODE_LENGTH = 6;

// Excludes easily-confused characters (0/O, 1/I, etc.) for readable codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a random room code like "K7QP2M". */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export type RoomStatus = "waiting" | "in_game" | "finished";

export type Room = {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  config: GameConfig;
};

export type RoomPlayer = {
  room_id: string;
  user_id: string;
  display_name: string;
  is_host: boolean;
  is_ready: boolean;
  joined_at: string;
};
