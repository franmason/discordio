"use client";

import { useEffect, useState } from "react";
import { Track } from "livekit-client";
import type { Participant } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  DisconnectButton,
  useParticipants,
  useIsSpeaking,
  useLocalParticipant,
} from "@livekit/components-react";
import { Channel, Profile } from "@/lib/supabase";

export default function VoiceChannel({
  channel,
  profile,
  onLeave,
}: {
  channel: Channel;
  profile: Profile;
  onLeave?: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setToken(null);
    setError(null);

    async function fetchToken() {
      try {
        const params = new URLSearchParams({
          room: channel.id,
          identity: profile.id,
          name: profile.name,
        });
        if (profile.avatar_url) params.set("avatar", profile.avatar_url);

        const res = await fetch(`/api/livekit-token?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao gerar token");
        if (active) setToken(data.token);
      } catch (err: any) {
        if (active) setError(err.message);
      }
    }
    fetchToken();
    return () => {
      active = false;
    };
  }, [channel.id, profile.id, profile.name, profile.avatar_url]);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-400">
        Erro ao conectar na sala de voz: {error}
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Conectando em 🔊 {channel.name}...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b border-black/20 px-4 font-semibold shadow-sm">
        🔊 {channel.name}
      </div>
      <LiveKitRoom
        key={channel.id}
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={false}
        audio={true}
        style={{ height: "100%" }}
        className="flex flex-1 flex-col overflow-hidden"
        onDisconnected={() => onLeave?.()}
      >
        <RoomAudioRenderer />
        <VoiceStage channelName={channel.name} />
        <VoiceControlBar />
      </LiveKitRoom>
    </div>
  );
}

function VoiceStage({ channelName }: { channelName: string }) {
  const participants = useParticipants();

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto bg-panelLight/40 p-8">
      <div className="flex flex-wrap items-start justify-center gap-8">
        {participants.map((p) => (
          <ParticipantAvatar key={p.identity} participant={p} />
        ))}
        {participants.length === 0 && (
          <p className="text-sm text-muted">
            Ninguém na sala {channelName} ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function ParticipantAvatar({ participant }: { participant: Participant }) {
  const isSpeaking = useIsSpeaking(participant);
  const isMicMuted = !participant.isMicrophoneEnabled;

  let avatarUrl: string | null = null;
  try {
    avatarUrl = participant.metadata
      ? JSON.parse(participant.metadata).avatar_url ?? null
      : null;
  } catch {
    avatarUrl = null;
  }

  const initials = participant.name?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <div
        className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xl font-bold text-white ring-4 transition ${
          isSpeaking ? "ring-green-500" : "ring-transparent"
        }`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Foto de perfil de ${participant.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="flex max-w-full items-center gap-1">
        <span className="truncate text-sm text-white">
          {participant.name}
        </span>
        {isMicMuted && <MicOffIcon className="shrink-0 text-red-400" />}
      </div>
    </div>
  );
}

function VoiceControlBar() {
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const [deafened, setDeafened] = useState(false);

  return (
    <div className="flex items-center justify-center gap-2 border-t border-black/20 bg-panel px-4 py-3">
      <TrackToggle
        source={Track.Source.Microphone}
        showIcon={false}
        title={isMicrophoneEnabled ? "Mutar microfone" : "Ativar microfone"}
        className={controlButtonClass(!isMicrophoneEnabled, "danger")}
      >
        {isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
      </TrackToggle>

      <button
        type="button"
        title={deafened ? "Ativar áudio" : "Ensurdecer"}
        aria-label={deafened ? "Ativar áudio" : "Ensurdecer"}
        onClick={() => setDeafened((d) => !d)}
        className={controlButtonClass(deafened, "danger")}
      >
        {deafened ? <HeadphoneOffIcon /> : <HeadphoneIcon />}
      </button>

      <TrackToggle
        source={Track.Source.Camera}
        showIcon={false}
        title={isCameraEnabled ? "Desligar câmera" : "Ligar câmera"}
        className={controlButtonClass(isCameraEnabled, "accent")}
      >
        <CameraIcon />
      </TrackToggle>

      <TrackToggle
        source={Track.Source.ScreenShare}
        showIcon={false}
        title={isScreenShareEnabled ? "Parar compartilhamento" : "Compartilhar tela"}
        className={controlButtonClass(isScreenShareEnabled, "accent")}
      >
        <ScreenShareIcon />
      </TrackToggle>

      <button
        type="button"
        title="Configurações"
        aria-label="Configurações"
        className={controlButtonClass(false)}
      >
        <SettingsIcon />
      </button>

      <DisconnectButton
        title="Sair da chamada"
        className="ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/90 text-white transition hover:bg-red-500"
      >
        <LeaveIcon />
      </DisconnectButton>
    </div>
  );
}

function controlButtonClass(active: boolean, variant: "accent" | "danger" = "accent") {
  const activeClasses =
    variant === "danger"
      ? "bg-red-500/90 text-white hover:bg-red-500"
      : "bg-accent text-white hover:bg-accentHover";

  return `flex h-10 w-10 items-center justify-center rounded-full transition ${
    active ? activeClasses : "bg-panelLight text-muted hover:bg-panelLight/70 hover:text-white"
  }`;
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2M19 10v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function HeadphoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function HeadphoneOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 15.5V12a9 9 0 0 0-15.3-6.4M3 12v3.5" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="9 10 12 7 15 10" />
      <line x1="12" y1="7" x2="12" y2="14" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a1 1 0 0 1 1.11-.21 11.36 11.36 0 0 0 3.55.57 1 1 0 0 1 1 1V19a1 1 0 0 1-1 1A17 17 0 0 1 3 5a1 1 0 0 1 1-1h2.99a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.55 1 1 0 0 1-.25 1l-1.28 1.76z" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}
