"use client";

import type { ReactNode } from "react";
import { Channel, Profile } from "@/lib/supabase";
import { useVoiceParticipants } from "@/lib/useVoiceParticipants";

export default function Sidebar({
  channels,
  activeChannelId,
  onSelect,
  profile,
  onSignOut,
  voiceConnected,
  voiceChannelName,
  onOpenProfile,
}: {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (channel: Channel) => void;
  profile: Profile;
  onSignOut: () => void;
  voiceConnected?: boolean;
  voiceChannelName?: string | null;
  onOpenProfile?: () => void;
}) {
  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  return (
    <aside className="flex h-full w-60 flex-col bg-panel">
      <div className="flex h-12 items-center border-b border-black/20 px-4 font-semibold shadow-sm">
        Minha Sala
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <ChannelGroup label="Canais de texto">
          {textChannels.map((c) => (
            <ChannelItem
              key={c.id}
              label={c.name}
              icon={<HashIcon />}
              active={c.id === activeChannelId}
              onClick={() => onSelect(c)}
            />
          ))}
        </ChannelGroup>

        <ChannelGroup label="Canais de voz">
          {voiceChannels.map((c) => (
            <div key={c.id}>
              <ChannelItem
                label={c.name}
                icon={<SpeakerIcon />}
                active={c.id === activeChannelId}
                onClick={() => onSelect(c)}
              />
              <VoiceParticipantList roomId={c.id} />
            </div>
          ))}
        </ChannelGroup>
      </div>

      {voiceConnected && (
        <div className="border-t border-black/20 bg-[#232428] px-2 pb-2 pt-2">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-semibold text-green-400">
                Conectado por voz
              </p>
              {voiceChannelName && (
                <p className="truncate text-[11px] text-muted">
                  {voiceChannelName}
                </p>
              )}
            </div>
          </div>

          <div
            id="voice-control-slot"
            className="flex items-center justify-center gap-1.5 rounded-md bg-black/20 px-2 py-1.5"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-1 border-t border-black/20 px-1.5 py-1.5">
        <button
          onClick={onOpenProfile}
          title="Editar perfil"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md px-1.5 py-1.5 text-left transition hover:bg-panelLight"
        >
          <Avatar profile={profile} size={32} />
          <span className="truncate text-sm font-medium">{profile.name}</span>
        </button>
        <button
          onClick={onSignOut}
          title="Sair da conta"
          className="shrink-0 rounded px-2 py-1 text-xs text-muted hover:bg-panelLight hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
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
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-white"
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

function VoiceParticipantList({ roomId }: { roomId: string }) {
  const participants = useVoiceParticipants(roomId);

  if (participants.length === 0) return null;

  return (
    <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-black/20 pl-3">
      {participants.map((p) => (
        <div
          key={p.identity}
          className="flex items-center gap-2 rounded px-1 py-1 text-sm text-muted"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-[10px] font-bold text-white">
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
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {p.hasScreenShare && (
              <ScreenShareIcon className="text-green-400" />
            )}
            {p.hasCamera && <CameraIcon className="text-green-400" />}
          </span>
        </div>
      ))}
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ScreenShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ChannelGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 px-2 text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function ChannelItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm transition ${
        active
          ? "bg-panelLight text-white"
          : "text-muted hover:bg-panelLight/60 hover:text-white"
      }`}
    >
      <span className="flex w-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function HashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
