"use client";

import { useState } from "react";
import type { StatusUpdate } from "@/lib/types";
import { formatStatusTime, formatTimeAgo } from "@/lib/format";

interface StatusFeedProps {
  statuses: StatusUpdate[];
  yourName: string;
  yourColor: string;
  youId: string | null;
  onPost: (text: string) => void;
}

const MAX_LENGTH = 280;

export function StatusFeed({
  statuses,
  yourName,
  yourColor,
  youId,
  onPost,
}: StatusFeedProps) {
  const [draft, setDraft] = useState("");

  const yourLatest = statuses.find((status) => status.userId === youId);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onPost(text);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Status feed</h2>
        <p className="text-xs text-slate-400">Share what you&apos;re up to</p>
      </div>

      {yourLatest && (
        <div className="shrink-0 border-b border-blue-500/20 bg-blue-500/10 px-4 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-300">
            Your latest
          </p>
          <p className="text-sm leading-relaxed text-white">{yourLatest.text}</p>
          <p className="mt-1 text-xs text-blue-200/70">
            {formatTimeAgo(yourLatest.createdAt)} ago
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-b border-white/10 p-4"
      >
        <div className="flex gap-3">
          <span
            className="mt-1 h-9 w-9 shrink-0 rounded-full"
            style={{ backgroundColor: yourColor }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, MAX_LENGTH))}
              placeholder={`What's happening, ${yourName}?`}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none ring-blue-500 placeholder:text-slate-500 focus:ring-2"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {draft.length}/{MAX_LENGTH}
              </span>
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-full bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {statuses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No statuses yet. Be the first to post!
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {statuses.map((status) => (
              <li key={status.id} className="px-4 py-4 transition hover:bg-white/[0.02]">
                <div className="flex gap-3">
                  <span
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-full"
                    style={{ backgroundColor: status.userColor }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-white">
                        {status.userName}
                        {status.userId === youId ? " (you)" : ""}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatTimeAgo(status.createdAt)} ·{" "}
                        {formatStatusTime(status.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
                      {status.text}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
