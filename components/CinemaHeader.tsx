"use client";

import { Channel } from "@/lib/supabase";

export default function CinemaHeader({
  channel,
  isLive,
  viewerCount,
  onOpenRooms,
  onToggleChat,
  chatOpen,
}: {
  channel: Channel | null;
  isLive: boolean;
  viewerCount: number;
  onOpenRooms: () => void;
  onToggleChat: () => void;
  chatOpen: boolean;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-panel/80 px-3 backdrop-blur-md md:h-16 md:px-6">
      <button
        onClick={onOpenRooms}
        title="Salas"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-white md:hidden"
      >
        <MenuIcon />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display text-base tracking-[0.1em] text-white md:text-xl">
            {channel?.name ?? "Nenhuma sala"}
          </p>
          {isLive && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Ao vivo
            </span>
          )}
        </div>
        {isLive && (
          <p className="hidden text-xs text-muted md:block">
            {viewerCount} {viewerCount === 1 ? "assistindo" : "assistindo"}
          </p>
        )}
      </div>

      <button
        onClick={onToggleChat}
        title="Bastidores"
        className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
          chatOpen
            ? "bg-gold/15 text-gold ring-1 ring-gold/30"
            : "text-muted hover:bg-white/5 hover:text-white"
        }`}
      >
        <ChatIcon />
        <span className="hidden sm:inline">Bastidores</span>
      </button>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
