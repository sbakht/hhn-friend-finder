"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { JoinForm } from "@/components/JoinForm";
import type { FriendLocation } from "@/lib/types";

const LocationMap = dynamic(
  () => import("@/components/LocationMap").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-900 text-slate-300">
        Loading map...
      </div>
    ),
  },
);

interface ShareAppProps {
  initialRoom?: string;
}

export function ShareApp({ initialRoom }: ShareAppProps) {
  const [joined, setJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [yourName, setYourName] = useState("");
  const [youId, setYouId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  const shareUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    return url.toString();
  }, [roomId]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startTracking = useCallback(
    (socket: Socket) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported in this browser.");
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (now - lastSentRef.current < 3000) return;
          lastSentRef.current = now;

          socket.emit("location:update", {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? "Location permission denied. Enable it to share your position."
              : "Unable to read your location.";
          setLocationError(message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        },
      );
    },
    [],
  );

  const handleJoin = useCallback(
    (nextRoomId: string, name: string) => {
      setIsConnecting(true);
      setLocationError(null);

      const socket = io(window.location.origin, {
        path: "/api/socket",
        transports: ["polling", "websocket"],
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      socketRef.current = socket;

      const joinTimeout = window.setTimeout(() => {
        setLocationError("Connection timed out. Please try again.");
        setIsConnecting(false);
        socket.disconnect();
      }, 12000);

      const clearJoinTimeout = () => window.clearTimeout(joinTimeout);

      socket.on("connect", () => {
        socket.emit(
          "join",
          { roomId: nextRoomId, name },
          (response: { userId: string; users: FriendLocation[] }) => {
            clearJoinTimeout();
            setYouId(response.userId);
            setFriends(
              response.users.map((user) => ({
                ...user,
                isYou: user.id === response.userId,
              })),
            );
            setRoomId(nextRoomId);
            setYourName(name);
            setJoined(true);
            setIsConnecting(false);
            startTracking(socket);

            const url = new URL(window.location.href);
            url.searchParams.set("room", nextRoomId);
            window.history.replaceState({}, "", url.toString());
          },
        );
      });

      socket.on("users:update", (users: FriendLocation[]) => {
        setFriends(
          users.map((user) => ({
            ...user,
            isYou: user.id === socket.id,
          })),
        );
      });

      socket.on("error", (payload: { message: string }) => {
        clearJoinTimeout();
        setLocationError(payload.message);
        setIsConnecting(false);
      });

      socket.on("connect_error", () => {
        clearJoinTimeout();
        setLocationError("Could not connect to the server.");
        setIsConnecting(false);
      });
    },
    [startTracking],
  );

  const handleLeave = useCallback(() => {
    stopTracking();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setJoined(false);
    setFriends([]);
    setYouId(null);
    setRoomId("");
    setYourName("");
    setLocationError(null);
  }, [stopTracking]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  useEffect(() => {
    return () => {
      stopTracking();
      socketRef.current?.disconnect();
    };
  }, [stopTracking]);

  if (!joined) {
    return (
      <JoinForm
        initialRoom={initialRoom}
        onJoin={handleJoin}
        isConnecting={isConnecting}
      />
    );
  }

  const onlineFriends = friends.filter(
    (friend) => friend.lat !== 0 || friend.lng !== 0,
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-950">
      <header className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-sm font-medium text-white">Room {roomId}</p>
          <p className="text-xs text-slate-400">
            {onlineFriends.length} on map · {friends.length} in room
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            {copied ? "Copied!" : "Copy invite link"}
          </button>
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/20"
          >
            Leave
          </button>
        </div>
      </header>

      {locationError && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          {locationError}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <LocationMap friends={friends} youId={youId} />

        <aside className="absolute bottom-4 left-4 right-4 max-w-sm rounded-xl border border-white/10 bg-slate-950/90 p-4 shadow-xl backdrop-blur md:right-auto">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Friends in room
          </p>
          <ul className="space-y-2">
            {friends.map((friend) => (
              <li
                key={friend.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: friend.color }}
                  />
                  <span className="text-white">
                    {friend.name}
                    {friend.id === youId ? " (you)" : ""}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {friend.lat === 0 && friend.lng === 0
                    ? "Locating..."
                    : "Live"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Signed in as {yourName}. Share the room link so friends can join.
          </p>
        </aside>
      </div>
    </div>
  );
}
