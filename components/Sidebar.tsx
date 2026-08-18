"use client";

import { Channel, Profile } from "@/lib/supabase";

export default function Sidebar({
  channels,
  activeChannelId,
  onSelect,
  profile,
  onSignOut,
}: {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (channel: Channel) => void;
  profile: Profile;
  onSignOut: () => void;
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
              icon="#"
              active={c.id === activeChannelId}
              onClick={() => onSelect(c)}
            />
          ))}
        </ChannelGroup>

        <ChannelGroup label="Canais de voz">
          {voiceChannels.map((c) => (
            <ChannelItem
              key={c.id}
              label={c.name}
              icon="🔊"
              active={c.id === activeChannelId}
              onClick={() => onSelect(c)}
            />
          ))}
        </ChannelGroup>
      </div>

      <div className="flex items-center justify-between border-t border-black/20 px-3 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Avatar profile={profile} size={32} />
          <span className="truncate text-sm font-medium">{profile.name}</span>
        </div>
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
  icon: string;
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
      <span className="w-4 text-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
