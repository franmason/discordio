"use client";

import { Channel, Profile } from "@/lib/supabase";
import { useVoiceParticipants } from "@/lib/useVoiceParticipants";

export default function Sidebar({
  channels,
  activeRoomId,
  onSelectRoom,
  onOpenChat,
  profile,
  onSignOut,
  onOpenProfile,
  mobileOpen,
  onCloseMobile,
}: {
  channels: Channel[];
  activeRoomId: string | null;
  onSelectRoom: (channel: Channel) => void;
  onOpenChat: (channel: Channel) => void;
  profile: Profile;
  onSignOut: () => void;
  onOpenProfile?: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  const content = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold/10 text-gold ring-1 ring-gold/25">
          <ReelIcon />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-lg tracking-[0.15em] text-white">
            CINE PRIVADO
          </p>
          <p className="truncate text-[10px] uppercase tracking-widest text-muted">
            Sessão entre amigos
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SectionLabel>Salas</SectionLabel>
        <div className="mb-5 flex flex-col gap-1.5">
          {voiceChannels.map((c) => (
            <RoomCard
              key={c.id}
              channel={c}
              active={c.id === activeRoomId}
              onClick={() => onSelectRoom(c)}
            />
          ))}
        </div>

        {textChannels.length > 0 && (
          <>
            <SectionLabel>Bastidores</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {textChannels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenChat(c)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-white"
                >
                  <HashIcon />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-white/5 px-2 py-2">
        <button
          onClick={onOpenProfile}
          title="Editar perfil"
          className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-md px-2 py-1.5 text-left transition hover:bg-white/5"
        >
          <Avatar profile={profile} size={34} />
          <span className="truncate text-sm font-medium text-white">
            {profile.name}
          </span>
        </button>
        <button
          onClick={onSignOut}
          title="Sair da conta"
          className="shrink-0 rounded-md p-2 text-muted hover:bg-white/5 hover:text-white"
        >
          <LogoutIcon />
        </button>
      </div>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`flex w-72 shrink-0 flex-col bg-panel/95 backdrop-blur-md transition-transform duration-300 md:static md:z-auto md:translate-x-0 md:border-r md:border-white/5 md:bg-panel ${
          mobileOpen
            ? "fixed inset-y-0 left-0 z-50 translate-x-0"
            : "fixed inset-y-0 left-0 z-50 -translate-x-full md:flex"
        }`}
      >
        {content}
      </aside>
    </>
  );
}

function RoomCard({
  channel,
  active,
  onClick,
}: {
  channel: Channel;
  active: boolean;
  onClick: () => void;
}) {
  const participants = useVoiceParticipants(channel.id);
  const streamer = participants.find((p) => p.hasScreenShare);

  return (
    <div>
      <button
        onClick={onClick}
        className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
          active
            ? "bg-gold/10 ring-1 ring-gold/30"
            : "hover:bg-white/5"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 transition ${
            active
              ? "bg-gold/15 text-gold ring-gold/40"
              : "bg-white/5 text-muted ring-white/10 group-hover:text-white"
          }`}
        >
          <SpeakerIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-medium ${
              active ? "text-white" : "text-gray-200"
            }`}
          >
            {channel.name}
          </p>
          <p className="truncate text-[11px] text-muted">
            {streamer
              ? `${streamer.name} está transmitindo`
              : participants.length > 0
              ? `${participants.length} na sala`
              : "Vazia"}
          </p>
        </div>
        {streamer && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Vivo
          </span>
        )}
      </button>

      {participants.length > 0 && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-white/5 pl-3">
          {participants.map((p) => (
            <div
              key={p.identity}
              className="flex items-center gap-2 rounded px-1 py-1 text-xs text-muted"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/80 text-[9px] font-bold text-white">
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={`Foto de perfil de ${p.name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  p.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="truncate">{p.name}</span>
              {p.hasScreenShare && (
                <span className="ml-auto shrink-0 text-gold">
                  <ScreenShareDotIcon />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/70">
      {children}
    </div>
  );
}

export function Avatar({
  profile,
  size,
}: {
  profile: Profile;
  size: number;
}) {
  const initials = profile.name.slice(0, 2).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-white ring-1 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={`Foto de perfil de ${profile.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function ReelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="7" r="1.4" />
      <circle cx="16.5" cy="9.7" r="1.4" />
      <circle cx="16.5" cy="14.3" r="1.4" />
      <circle cx="12" cy="17" r="1.4" />
      <circle cx="7.5" cy="14.3" r="1.4" />
      <circle cx="7.5" cy="9.7" r="1.4" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M18.36 5.64a9 9 0 0 1 0 12.72" />
    </svg>
  );
}

function ScreenShareDotIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
