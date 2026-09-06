import { randomUUID } from "crypto";
import type { FriendLocation, StatusUpdate } from "@/lib/types";

const MAX_STATUSES = 100;
const STALE_USER_MS = 90_000;

const FRIEND_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

interface RoomUser {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  updatedAt: number;
  latestStatus: string | null;
  latestStatusAt: number | null;
}

interface RoomState {
  users: Record<string, RoomUser>;
  statuses: StatusUpdate[];
}

declare global {
  // eslint-disable-next-line no-var
  var __friendLocatorRooms: Map<string, RoomState> | undefined;
}

function getRooms() {
  if (!globalThis.__friendLocatorRooms) {
    globalThis.__friendLocatorRooms = new Map();
  }
  return globalThis.__friendLocatorRooms;
}

function getRoomState(roomId: string): RoomState {
  const rooms = getRooms();
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: {}, statuses: [] });
  }
  return rooms.get(roomId)!;
}

function pickColor(room: RoomState): string {
  const usedColors = new Set(
    Object.values(room.users).map((user) => user.color),
  );
  const available = FRIEND_COLORS.find((color) => !usedColors.has(color));
  return available ?? FRIEND_COLORS[Math.floor(Math.random() * FRIEND_COLORS.length)];
}

function pruneStaleUsers(room: RoomState) {
  const now = Date.now();
  for (const [id, user] of Object.entries(room.users)) {
    if (now - user.updatedAt > STALE_USER_MS) {
      delete room.users[id];
    }
  }
}

function toFriendLocations(
  room: RoomState,
  youId?: string,
): FriendLocation[] {
  return Object.values(room.users).map((user) => ({
    ...user,
    isYou: user.id === youId,
  }));
}

export function joinRoom(roomId: string, name: string) {
  const trimmedRoom = roomId.trim().toUpperCase();
  const trimmedName = name.trim();

  if (!trimmedRoom || !trimmedName) {
    throw new Error("Room code and name are required.");
  }

  const room = getRoomState(trimmedRoom);
  pruneStaleUsers(room);

  const userId = randomUUID();
  const user: RoomUser = {
    id: userId,
    name: trimmedName,
    lat: 0,
    lng: 0,
    color: pickColor(room),
    updatedAt: Date.now(),
    latestStatus: null,
    latestStatusAt: null,
  };

  room.users[userId] = user;

  return {
    userId,
    users: toFriendLocations(room, userId),
    statuses: room.statuses,
  };
}

export function getRoomSnapshot(roomId: string, youId?: string) {
  const trimmedRoom = roomId.trim().toUpperCase();
  const room = getRoomState(trimmedRoom);
  pruneStaleUsers(room);

  return {
    users: toFriendLocations(room, youId),
    statuses: room.statuses,
  };
}

export function updateLocation(
  roomId: string,
  userId: string,
  lat: number,
  lng: number,
) {
  const room = getRoomState(roomId.trim().toUpperCase());
  const user = room.users[userId];
  if (!user) return false;

  user.lat = lat;
  user.lng = lng;
  user.updatedAt = Date.now();
  return true;
}

export function postStatus(roomId: string, userId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 280) return false;

  const room = getRoomState(roomId.trim().toUpperCase());
  const user = room.users[userId];
  if (!user) return false;

  const status: StatusUpdate = {
    id: randomUUID(),
    userId,
    userName: user.name,
    userColor: user.color,
    text: trimmed,
    createdAt: Date.now(),
  };

  room.statuses.unshift(status);
  if (room.statuses.length > MAX_STATUSES) {
    room.statuses.length = MAX_STATUSES;
  }

  user.latestStatus = trimmed;
  user.latestStatusAt = status.createdAt;
  user.updatedAt = Date.now();
  return true;
}

export function leaveRoom(roomId: string, userId: string) {
  const rooms = getRooms();
  const room = rooms.get(roomId.trim().toUpperCase());
  if (!room) return;

  delete room.users[userId];
  if (Object.keys(room.users).length === 0) {
    rooms.delete(roomId.trim().toUpperCase());
  }
}

export function touchUser(roomId: string, userId: string) {
  const room = getRoomState(roomId.trim().toUpperCase());
  const user = room.users[userId];
  if (!user) return false;
  user.updatedAt = Date.now();
  return true;
}
