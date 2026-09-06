"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JoinForm } from "@/components/JoinForm";
import { StatusFeed } from "@/components/StatusFeed";
import type { FriendLocation, JoinResponse, StatusUpdate } from "@/lib/types";
import { formatTimeAgo } from "@/lib/format";

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

type ActiveView = "map" | "feed";

export function ShareApp({ initialRoom }: ShareAppProps) {
  const [joined, setJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [yourName, setYourName] = useState("");
  const [youId, setYouId] = useState<string | null>(null);
  const [yourColor, setYourColor] = useState("#3b82f6");
  const [friends, setFriends] = useState<FriendLocation[]>([]);
  const [statuses, setStatuses] = useState<StatusUpdate[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("map");

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const pollRef = useRef<number | null>(null);

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

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchState = useCallback(
    async (currentRoomId: string, currentUserId: string) => {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(currentRoomId)}/state?userId=${encodeURIComponent(currentUserId)}`,
      );
      if (!response.ok) return;

      const data = (await response.json()) as {
        users: FriendLocation[];
        statuses: StatusUpdate[];
      };

      setFriends(
        data.users.map((user) => ({
          ...user,
          isYou: user.id === currentUserId,
        })),
      );
      setStatuses(data.statuses);

      const you = data.users.find((user) => user.id === currentUserId);
      if (you?.color) setYourColor(you.color);
    },
    [],
  );

  const startPolling = useCallback(
    (currentRoomId: string, currentUserId: string) => {
      stopPolling();
      void fetchState(currentRoomId, currentUserId);
      pollRef.current = window.setInterval(() => {
        void fetchState(currentRoomId, currentUserId);
      }, 2000);
    },
    [fetchState, stopPolling],
  );

  const startTracking = useCallback(
    (currentRoomId: string, currentUserId: string) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported in this browser.");
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (now - lastSentRef.current < 3000) return;
          lastSentRef.current = now;

          void fetch(
            `/api/rooms/${encodeURIComponent(currentRoomId)}/location`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: currentUserId,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }),
            },
          );
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
    async (nextRoomId: string, name: string) => {
      setIsConnecting(true);
      setLocationError(null);

      try {
        const response = await fetch(
          `/api/rooms/${encodeURIComponent(nextRoomId)}/join`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          },
        );

        const data = (await response.json()) as JoinResponse & { message?: string };
        if (!response.ok) {
          throw new Error(data.message ?? "Unable to join room.");
        }

        const you = data.users.find((user) => user.id === data.userId);
        setYouId(data.userId);
        setYourColor(you?.color ?? "#3b82f6");
        setFriends(
          data.users.map((user) => ({
            ...user,
            isYou: user.id === data.userId,
          })),
        );
        setStatuses(data.statuses);
        setRoomId(nextRoomId);
        setYourName(name);
        setJoined(true);
        setIsConnecting(false);
        startPolling(nextRoomId, data.userId);
        startTracking(nextRoomId, data.userId);

        const url = new URL(window.location.href);
        url.searchParams.set("room", nextRoomId);
        window.history.replaceState({}, "", url.toString());
      } catch (error) {
        setLocationError(
          error instanceof Error ? error.message : "Could not connect to the server.",
        );
        setIsConnecting(false);
      }
    },
    [startPolling, startTracking],
  );

  const handlePostStatus = useCallback(
    async (text: string) => {
      if (!roomId || !youId) return;

      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: youId, text }),
      });
      await fetchState(roomId, youId);
      setActiveView("feed");
    },
    [fetchState, roomId, youId],
  );

  const handleLeave = useCallback(() => {
    stopTracking();
    stopPolling();

    if (roomId && youId) {
      void fetch(`/api/rooms/${encodeURIComponent(roomId)}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: youId }),
        keepalive: true,
      });
    }

    setJoined(false);
    setFriends([]);
    setStatuses([]);
    setYouId(null);
    setRoomId("");
    setYourName("");
    setLocationError(null);
    setActiveView("map");
  }, [roomId, stopPolling, stopTracking, youId]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  useEffect(() => {
    return () => {
      stopTracking();
      stopPolling();
    };
  }, [stopPolling, stopTracking]);

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
      <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-sm font-medium text-white">Room {roomId}</p>
          <p className="text-xs text-slate-400">
            {onlineFriends.length} on map · {statuses.length} statuses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="hidden rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 sm:inline-flex"
          >
            {copied ? "Copied!" : "Copy link"}
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

      <div className="flex shrink-0 border-b border-white/10 md:hidden">
        <button
          type="button"
          onClick={() => setActiveView("map")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
            activeView === "map"
              ? "border-b-2 border-blue-500 text-white"
              : "text-slate-400"
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setActiveView("feed")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
            activeView === "feed"
              ? "border-b-2 border-blue-500 text-white"
              : "text-slate-400"
          }`}
        >
          Status feed
        </button>
      </div>

      {locationError && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          {locationError}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div
          className={`relative min-h-0 min-w-0 flex-1 ${
            activeView === "feed" ? "hidden md:block" : "block"
          }`}
        >
          <LocationMap friends={friends} youId={youId} />

          <aside className="absolute bottom-4 left-4 right-4 max-w-sm rounded-xl border border-white/10 bg-slate-950/90 p-4 shadow-xl backdrop-blur md:right-auto">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Friends in room
            </p>
            <ul className="space-y-3">
              {friends.map((friend) => (
                <li key={friend.id} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
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
                  </div>
                  {friend.latestStatus && (
                    <p className="mt-1 line-clamp-2 pl-5 text-xs leading-relaxed text-slate-400">
                      {friend.latestStatus}
                      {friend.latestStatusAt && (
                        <span className="ml-1 text-slate-500">
                          · {formatTimeAgo(friend.latestStatusAt)}
                        </span>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <div
          className={`min-h-0 w-full border-white/10 md:w-[380px] md:shrink-0 md:border-l ${
            activeView === "map" ? "hidden md:flex" : "flex"
          }`}
        >
          <StatusFeed
            statuses={statuses}
            yourName={yourName}
            yourColor={yourColor}
            youId={youId}
            onPost={handlePostStatus}
          />
        </div>
      </div>
    </div>
  );
}
