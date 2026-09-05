"use client";

import { useState } from "react";

interface JoinFormProps {
  initialRoom?: string;
  onJoin: (roomId: string, name: string) => void;
  isConnecting: boolean;
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function JoinForm({ initialRoom, onJoin, isConnecting }: JoinFormProps) {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState(initialRoom ?? generateRoomCode());

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onJoin(roomId.trim().toUpperCase(), name.trim());
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-2xl">
            📍
          </div>
          <h1 className="text-2xl font-semibold text-white">Friend Locator</h1>
          <p className="mt-2 text-sm text-slate-300">
            Share a room code with friends and see everyone on the map in real
            time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Alex"
              maxLength={24}
              required
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none ring-blue-500 placeholder:text-slate-500 focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="room"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              Room code
            </label>
            <div className="flex gap-2">
              <input
                id="room"
                type="text"
                value={roomId}
                onChange={(event) =>
                  setRoomId(event.target.value.toUpperCase())
                }
                placeholder="ABC123"
                maxLength={12}
                required
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 font-mono uppercase tracking-widest text-white outline-none ring-blue-500 placeholder:text-slate-500 focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setRoomId(generateRoomCode())}
                className="shrink-0 rounded-xl border border-white/10 px-3 text-sm text-slate-300 transition hover:bg-white/10"
                title="Generate new room code"
              >
                New
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Friends join with the same room code.
            </p>
          </div>

          <button
            type="submit"
            disabled={isConnecting || !name.trim() || !roomId.trim()}
            className="w-full rounded-xl bg-blue-500 px-4 py-3 font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting ? "Connecting..." : "Join map"}
          </button>
        </form>
      </div>
    </div>
  );
}
