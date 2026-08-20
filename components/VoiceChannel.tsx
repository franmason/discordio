"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Track } from "livekit-client";
import type { Participant } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  DisconnectButton,
  VideoTrack,
  useParticipants,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
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
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
        <SpeakerIcon /> Conectando em {channel.name}...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-2 border-b border-gold/20 px-4 font-display text-lg uppercase tracking-wider shadow-sm">
        <SpeakerIcon /> {channel.name}
      </div>
      <LiveKitRoom
        key={channel.id}
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={false}
        audio={false}
        options={{ adaptiveStream: true, dynacast: true }}
        style={{ height: "100%" }}
        className="flex flex-1 flex-col overflow-hidden"
        onDisconnected={() => onLeave?.()}
      >
        <RoomHall channelName={channel.name} />
      </LiveKitRoom>
    </div>
  );
}

// Cinema: sem microfone. Só quem compartilha tela/webcam publica algo;
// o resto é só assistir e mexer no volume.
const RESOLUTIONS = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "1440p": { width: 2560, height: 1440 },
} as const;
type ResolutionKey = keyof typeof RESOLUTIONS;
type FpsKey = 30 | 60;

function RoomHall({ channelName }: { channelName: string }) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [resolution, setResolution] = useState<ResolutionKey>("1080p");
  const [fps, setFps] = useState<FpsKey>(30);

  return (
    <>
      <RoomAudioRenderer volume={muted ? 0 : volume} />
      <VoiceStage channelName={channelName} />
      <VoiceControlBar
        volume={volume}
        muted={muted}
        onVolumeChange={setVolume}
        onToggleMuted={() => setMuted((m) => !m)}
        resolution={resolution}
        fps={fps}
        onResolutionChange={setResolution}
        onFpsChange={setFps}
      />
    </>
  );
}

function VoiceStage({ channelName }: { channelName: string }) {
  const participants = useParticipants();
  const allScreenShareTracks = useTracks([Track.Source.ScreenShare]).filter(
    (t) => !t.publication.isMuted
  );
  const cameraTracks = useTracks([Track.Source.Camera]).filter(
    (t) => !t.publication.isMuted
  );

  // Parar de assistir é só uma preferência local: some daqui, mas
  // continua chegando pra quem não fechou.
  const [hiddenSids, setHiddenSids] = useState<Set<string>>(new Set());
  const screenShareTracks = allScreenShareTracks.filter(
    (t) => !hiddenSids.has(t.publication.trackSid)
  );
  const hiddenTracks = allScreenShareTracks.filter((t) =>
    hiddenSids.has(t.publication.trackSid)
  );

  function stopWatching(trackSid: string) {
    setHiddenSids((prev) => new Set(prev).add(trackSid));
  }

  function resumeWatching(trackSid: string) {
    setHiddenSids((prev) => {
      const next = new Set(prev);
      next.delete(trackSid);
      return next;
    });
  }

  // Só webcams, sem ninguém compartilhando tela: os blocos ficam grandes,
  // num grid que se ajusta à quantidade de gente (pensado pra ~8 amigos).
  if (screenShareTracks.length === 0 && cameraTracks.length > 0) {
    return (
      <div
        className="grid flex-1 auto-rows-fr gap-3 overflow-y-auto bg-black/40 p-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        {cameraTracks.map((track) => (
          <div
            key={track.publication.trackSid}
            className="relative overflow-hidden rounded-lg bg-black"
          >
            <VideoTrack
              trackRef={track}
              className="h-full w-full object-cover"
            />
            <p className="absolute bottom-0 left-0 bg-black/60 px-2 py-1 text-xs text-white">
              {track.participant.name}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (screenShareTracks.length > 0) {
    return (
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-black/40 p-4">
        {cameraTracks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {cameraTracks.map((track) => (
              <div
                key={track.publication.trackSid}
                className="w-56 overflow-hidden rounded-lg bg-black"
              >
                <VideoTrack trackRef={track} className="w-full" />
                <p className="bg-black/60 px-2 py-1 text-xs text-white">
                  {track.participant.name}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-1 flex-wrap items-center justify-center gap-4">
          {screenShareTracks.map((track) => (
            <ScreenShareTile
              key={track.publication.trackSid}
              track={track}
              onStopWatching={() => stopWatching(track.publication.trackSid)}
            />
          ))}
        </div>

        <HiddenSharesBar tracks={hiddenTracks} onResume={resumeWatching} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto bg-panelLight/40 p-8">
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
      <HiddenSharesBar tracks={hiddenTracks} onResume={resumeWatching} />
    </div>
  );
}

function HiddenSharesBar({
  tracks,
  onResume,
}: {
  tracks: TrackReference[];
  onResume: (trackSid: string) => void;
}) {
  if (tracks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {tracks.map((track) => (
        <button
          key={track.publication.trackSid}
          type="button"
          onClick={() => onResume(track.publication.trackSid)}
          className="flex items-center gap-2 rounded-full bg-panel px-3 py-1.5 text-xs text-muted transition hover:bg-panelLight hover:text-white"
        >
          <ScreenShareIcon />
          Assistir a tela de {track.participant.name} de novo
        </button>
      ))}
    </div>
  );
}

function ScreenShareTile({
  track,
  onStopWatching,
}: {
  track: TrackReference;
  onStopWatching: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  return (
    <div
      ref={containerRef}
      className={`group relative flex h-full max-h-full w-full max-w-full flex-col overflow-hidden bg-black ${
        isFullscreen ? "" : "rounded-lg"
      }`}
    >
      <VideoTrack
        trackRef={track}
        className="h-full w-full flex-1 object-contain"
      />
      <p className="absolute bottom-0 left-0 bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
        {track.participant.name} está compartilhando a tela
      </p>
      <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
        {!isFullscreen && (
          <button
            type="button"
            onClick={onStopWatching}
            title="Parar de assistir"
            aria-label="Parar de assistir"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <StopWatchingIcon />
          </button>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );
}

function ParticipantAvatar({ participant }: { participant: Participant }) {
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
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xl font-bold text-white">
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
      <span className="max-w-full truncate text-sm text-white">
        {participant.name}
      </span>
    </div>
  );
}

function VoiceControlBar({
  volume,
  muted,
  onVolumeChange,
  onToggleMuted,
  resolution,
  fps,
  onResolutionChange,
  onFpsChange,
}: {
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMuted: () => void;
  resolution: ResolutionKey;
  fps: FpsKey;
  onResolutionChange: (r: ResolutionKey) => void;
  onFpsChange: (f: FpsKey) => void;
}) {
  const { isCameraEnabled, isScreenShareEnabled, localParticipant } =
    useLocalParticipant();
  const slot = usePortalTarget("voice-control-slot");
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  // Só a tela compartilhada pode ter áudio (a webcam nunca tem) — o
  // controle de volume só faz sentido enquanto isso estiver rolando.
  const anyoneSharingScreen = useTracks([Track.Source.ScreenShare]).some(
    (t) => !t.publication.isMuted
  );

  async function startScreenShare() {
    setStarting(true);
    try {
      await localParticipant.setScreenShareEnabled(
        true,
        {
          audio: true,
          systemAudio: "include",
          video: { displaySurface: "monitor" },
          resolution: { ...RESOLUTIONS[resolution], frameRate: fps },
          contentHint: "motion",
        },
        { videoCodec: "vp8", simulcast: false }
      );
      setShareMenuOpen(false);
    } catch {
      // Usuário cancelou o seletor de tela do navegador, ou negou permissão.
    } finally {
      setStarting(false);
    }
  }

  function handleScreenShareClick() {
    if (isScreenShareEnabled) {
      localParticipant.setScreenShareEnabled(false);
      setShareMenuOpen(false);
    } else {
      setShareMenuOpen((o) => !o);
    }
  }

  const bar = (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <TrackToggle
        source={Track.Source.Camera}
        showIcon={false}
        title={isCameraEnabled ? "Desligar webcam" : "Compartilhar webcam"}
        className={controlButtonClass(isCameraEnabled, "accent", true)}
      >
        <CameraIcon />
      </TrackToggle>

      <button
        ref={shareButtonRef}
        type="button"
        title={isScreenShareEnabled ? "Parar compartilhamento" : "Compartilhar tela"}
        aria-label={isScreenShareEnabled ? "Parar compartilhamento" : "Compartilhar tela"}
        onClick={handleScreenShareClick}
        className={controlButtonClass(isScreenShareEnabled || shareMenuOpen, "accent", true)}
      >
        <ScreenShareIcon />
      </button>

      {shareMenuOpen && !isScreenShareEnabled && (
        <AnchoredPopover
          anchorRef={shareButtonRef}
          onClose={() => setShareMenuOpen(false)}
        >
          <p className="mb-2 text-xs font-bold uppercase text-muted">
            Compartilhar tela
          </p>

          <p className="mb-1 text-xs text-muted">Resolução</p>
          <div className="mb-3 flex gap-1">
            {(Object.keys(RESOLUTIONS) as ResolutionKey[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onResolutionChange(r)}
                className={`flex-1 rounded px-1 py-1 text-xs transition ${
                  resolution === r
                    ? "bg-accent text-white"
                    : "bg-panelLight text-muted hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <p className="mb-1 text-xs text-muted">Taxa de quadros</p>
          <div className="mb-3 flex gap-1">
            {([30, 60] as FpsKey[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFpsChange(f)}
                className={`flex-1 rounded px-1 py-1 text-xs transition ${
                  fps === f
                    ? "bg-accent text-white"
                    : "bg-panelLight text-muted hover:text-white"
                }`}
              >
                {f} fps
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={startScreenShare}
            disabled={starting}
            className="w-full rounded bg-accent py-1.5 text-xs font-medium text-white transition hover:bg-accentHover disabled:opacity-60"
          >
            {starting ? "Iniciando..." : "Iniciar compartilhamento"}
          </button>
        </AnchoredPopover>
      )}

      {anyoneSharingScreen && (
        <div className="flex items-center gap-1.5 rounded-full bg-panel px-2 py-1">
          <button
            type="button"
            title={muted ? "Ativar áudio" : "Mutar áudio"}
            aria-label={muted ? "Ativar áudio" : "Mutar áudio"}
            onClick={onToggleMuted}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-muted transition hover:text-white"
          >
            {muted || volume === 0 ? <VolumeOffIcon /> : <VolumeIcon />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : Math.round(volume * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              onVolumeChange(v);
              if (v > 0 && muted) onToggleMuted();
            }}
            className="w-14 accent-accent"
            aria-label="Volume"
          />
        </div>
      )}

      <DisconnectButton
        title="Sair do canal"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-white transition hover:bg-red-500"
      >
        <LeaveIcon />
      </DisconnectButton>
    </div>
  );

  if (!slot) return null;
  return createPortal(bar, slot);
}

// Renderiza fixo em document.body posicionado perto do botão, pra nunca
// ficar cortado pela sidebar estreita (que tem overflow limitado).
function AnchoredPopover({
  anchorRef,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = 208;
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8
    );
    const top = Math.max(8, rect.top - 8);
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: pos.top, left: pos.left, width: 208, transform: "translateY(-100%)" }}
      className="fixed z-50 rounded-lg bg-panel p-3 text-sm shadow-xl ring-1 ring-black/30"
    >
      {children}
    </div>,
    document.body
  );
}

// Sobe os controles pra dentro do slot que fica no Sidebar, perto do
// perfil/botão de sair — igual o Discord de verdade, em vez de uma
// barra separada embaixo do vídeo.
function usePortalTarget(id: string) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(id));
  }, [id]);

  return target;
}

function controlButtonClass(
  active: boolean,
  variant: "accent" | "danger" = "accent",
  small = false
) {
  const activeClasses =
    variant === "danger"
      ? "bg-red-500/90 text-white hover:bg-red-500"
      : "bg-accent text-white hover:bg-accentHover";
  const size = small ? "h-8 w-8" : "h-10 w-10";

  return `flex ${size} items-center justify-center rounded-full transition ${
    active ? activeClasses : "bg-panelLight text-muted hover:bg-panelLight/70 hover:text-white"
  }`;
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

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M18.36 5.64a9 9 0 0 1 0 12.72" />
    </svg>
  );
}

function VolumeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
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

function StopWatchingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.6 19.6 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a19.7 19.7 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FullscreenExitIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
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
