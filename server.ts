import { createServer } from "http";
import { networkInterfaces } from "os";
import { parse } from "url";
import next from "next";
import { Server, type Socket } from "socket.io";
import { randomUUID } from "crypto";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 43123);
const MAX_STATUSES = 100;

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

interface StatusUpdate {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  createdAt: number;
}

const rooms = new Map<string, Map<string, RoomUser>>();
const roomStatuses = new Map<string, StatusUpdate[]>();

function getRoomUsers(roomId: string): RoomUser[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.values());
}

function getRoomStatuses(roomId: string): StatusUpdate[] {
  return roomStatuses.get(roomId) ?? [];
}

function pickColor(roomId: string): string {
  const room = rooms.get(roomId);
  const used = new Set(room ? room.values() : []);
  const usedColors = new Set(
    Array.from(used).map((user) => user.color),
  );
  const available = FRIEND_COLORS.find((color) => !usedColors.has(color));
  if (available) return available;
  return FRIEND_COLORS[Math.floor(Math.random() * FRIEND_COLORS.length)];
}

function broadcastRoom(io: Server, roomId: string) {
  io.to(roomId).emit("users:update", getRoomUsers(roomId));
}

function broadcastStatuses(io: Server, roomId: string) {
  io.to(roomId).emit("statuses:update", getRoomStatuses(roomId));
}

function removeUser(
  io: Server,
  socket: Socket,
  roomId: string | null,
  userId: string | null,
) {
  if (!roomId || !userId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.delete(userId);
  if (room.size === 0) {
    rooms.delete(roomId);
    roomStatuses.delete(roomId);
  } else {
    broadcastRoom(io, roomId);
  }
}

function getLanAddresses(): string[] {
  const addresses: string[] = [];
  for (const iface of Object.values(networkInterfaces())) {
    for (const config of iface ?? []) {
      if (config.family === "IPv4" && !config.internal) {
        addresses.push(config.address);
      }
    }
  }
  return addresses;
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer();

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: true,
      credentials: true,
    },
    transports: ["polling", "websocket"],
  });

  httpServer.on("request", (req, res) => {
    const pathname = parse(req.url ?? "", true).pathname ?? "";
    if (pathname.startsWith("/api/socket")) {
      return;
    }
    handle(req, res, parse(req.url ?? "", true));
  });

  io.on("connection", (socket) => {
    let currentRoom: string | null = null;
    let userId: string | null = null;

    socket.on(
      "join",
      (
        { roomId, name }: { roomId: string; name: string },
        callback?: (response: {
          userId: string;
          users: RoomUser[];
          statuses: StatusUpdate[];
        }) => void,
      ) => {
        const trimmedRoom = roomId.trim().toUpperCase();
        const trimmedName = name.trim();

        if (!trimmedRoom || !trimmedName) {
          socket.emit("error", { message: "Room code and name are required." });
          return;
        }

        if (currentRoom) {
          socket.leave(currentRoom);
          removeUser(io, socket, currentRoom, userId);
        }

        currentRoom = trimmedRoom;
        userId = socket.id;

        if (!rooms.has(trimmedRoom)) {
          rooms.set(trimmedRoom, new Map());
        }
        if (!roomStatuses.has(trimmedRoom)) {
          roomStatuses.set(trimmedRoom, []);
        }

        const user: RoomUser = {
          id: userId,
          name: trimmedName,
          lat: 0,
          lng: 0,
          color: pickColor(trimmedRoom),
          updatedAt: Date.now(),
          latestStatus: null,
          latestStatusAt: null,
        };

        rooms.get(trimmedRoom)!.set(userId, user);
        socket.join(trimmedRoom);
        broadcastRoom(io, trimmedRoom);

        callback?.({
          userId,
          users: getRoomUsers(trimmedRoom),
          statuses: getRoomStatuses(trimmedRoom),
        });
      },
    );

    socket.on(
      "location:update",
      ({ lat, lng }: { lat: number; lng: number }) => {
        if (!currentRoom || !userId) return;

        const room = rooms.get(currentRoom);
        const user = room?.get(userId);
        if (!user) return;

        user.lat = lat;
        user.lng = lng;
        user.updatedAt = Date.now();
        broadcastRoom(io, currentRoom);
      },
    );

    socket.on("status:post", ({ text }: { text: string }) => {
      if (!currentRoom || !userId) return;

      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 280) return;

      const room = rooms.get(currentRoom);
      const user = room?.get(userId);
      if (!user) return;

      const status: StatusUpdate = {
        id: randomUUID(),
        userId,
        userName: user.name,
        userColor: user.color,
        text: trimmed,
        createdAt: Date.now(),
      };

      const statuses = roomStatuses.get(currentRoom) ?? [];
      statuses.unshift(status);
      if (statuses.length > MAX_STATUSES) {
        statuses.length = MAX_STATUSES;
      }
      roomStatuses.set(currentRoom, statuses);

      user.latestStatus = trimmed;
      user.latestStatusAt = status.createdAt;

      broadcastStatuses(io, currentRoom);
      broadcastRoom(io, currentRoom);
    });

    socket.on("disconnect", () => {
      removeUser(io, socket, currentRoom, userId);
      currentRoom = null;
      userId = null;
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://localhost:${port}`);
    for (const address of getLanAddresses()) {
      console.log(`> On your Wi-Fi, open http://${address}:${port} from your phone`);
    }
    console.log(`> For iPhone geolocation, use an HTTPS tunnel (see README)`);
  });
});
