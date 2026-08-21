"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScreenSharePresets, Track } from "livekit-client";
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
  useDataChannel,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { Channel, Profile } from "@/lib/supabase";
import { useVoiceParticipants } from "@/lib/useVoiceParticipants";
import ChatChannel from "@/components/ChatChannel";

export default function VoiceChannel({
  channel,
  profile,
  minimized = false,
  onExpand,
  chatChannel = null,
  onStageChatOpen,
}: {
  channel: Channel;
  profile: Profile;
  minimized?: boolean;
  onExpand?: () => void;
  chatChannel?: Channel | null;
  onStageChatOpen?: () => void;
}) {
  const [joined, setJoined] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const participants = useVoiceParticipants(channel.id);

  // Trocou de sala: volta pro saguão em vez de continuar conectado na antiga.
  useEffect(() => {
    setJoined(false);
    setToken(null);
    setError(null);
  }, [channel.id]);

  useEffect(() => {
    if (!joined) return;
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
  }, [joined, channel.id, profile.id, profile.name, profile.avatar_url]);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

  if (!joined) {
    return (
      <VoiceLobby
        channelName={channel.name}
        participants={participants}
        onJoin={() => setJoined(true)}
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-red-400">
        Erro ao conectar na sala: {error}
        <button
          type="button"
          onClick={() => setJoined(false)}
          className="rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
        Preparando a sala {channel.name}...
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={channel.id}
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      video={false}
      audio={false}
      options={{ adaptiveStream: true, dynacast: true }}
      style={{ height: "100%" }}
      className="flex h-full flex-col overflow-hidden"
      onDisconnected={() => setJoined(false)}
    >
      <RoomHall
        channelName={channel.name}
        minimized={minimized}
        onExpand={onExpand}
        profile={profile}
        chatChannel={chatChannel}
        onStageChatOpen={onStageChatOpen}
      />
    </LiveKitRoom>
  );
}

// Saguão: fica aqui até clicar em "Entrar" — só depois disso a gente
// pede token e conecta no LiveKit (não entra na call sozinho).
function VoiceLobby({
  channelName,
  participants,
  onJoin,
}: {
  channelName: string;
  participants: ReturnType<typeof useVoiceParticipants>;
  onJoin: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-panel/60 to-black p-8 text-center">
      <div>
        <p className="mb-1 font-display text-sm uppercase tracking-[0.3em] text-muted">
          {participants.length > 0 ? "Sessão em andamento" : "Sala fechada"}
        </p>
        <p className="text-xs text-muted">
          {participants.length > 0
            ? `${participants.length} ${
                participants.length === 1 ? "pessoa" : "pessoas"
              } na sala ${channelName}`
            : `Ninguém na sala ${channelName} ainda`}
        </p>
      </div>

      {participants.length > 0 && (
        <div className="flex flex-wrap items-start justify-center gap-8">
          {participants.map((p) => (
            <div key={p.identity} className="flex w-24 flex-col items-center gap-2">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xl font-bold text-white ring-2 ring-white/10">
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
              <span className="max-w-full truncate text-sm text-white">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onJoin}
        className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-accentHover"
      >
        <EnterIcon />
        Entrar no canal de voz
      </button>
    </div>
  );
}

function EnterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
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

// Bitrate alvo por resolução/fps — sem isso o LiveKit usa um default
// conservador (pensado pra tela estática/texto) que não segura vídeo em
// movimento nas resoluções mais altas. 60fps pede bem mais que o dobro
// de 30fps porque cada quadro extra ainda carrega a mesma riqueza de cor.
//
// Estes são valores de PICO da camada mais alta, não o que roda sempre: o
// congestion control do WebRTC só chega neles se a banda aguentar. Ainda
// assim ficam abaixo do que já esteve aqui (15 Mbps em 1440p60), porque
// alvo alto demais faz o encoder oscilar tentando alcançar algo que o
// upload doméstico não entrega — e oscilação é justamente o que trava.
const SCREEN_SHARE_BITRATE: Record<ResolutionKey, Record<FpsKey, number>> = {
  "720p": { 30: 2_500_000, 60: 4_000_000 },
  "1080p": { 30: 5_000_000, 60: 8_000_000 },
  "1440p": { 30: 8_000_000, 60: 12_000_000 },
};

function RoomHall({
  channelName,
  minimized,
  onExpand,
  profile,
  chatChannel,
  onStageChatOpen,
}: {
  channelName: string;
  minimized: boolean;
  onExpand?: () => void;
  profile: Profile;
  chatChannel: Channel | null;
  onStageChatOpen?: () => void;
}) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [resolution, setResolution] = useState<ResolutionKey>("1080p");
  const [fps, setFps] = useState<FpsKey>(30);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageFullscreen, setStageFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [stageChatOpen, setStageChatOpen] = useState(false);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onChange() {
      setStageFullscreen(document.fullscreenElement === stageRef.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Fora da tela cheia já tem o botão "Bastidores" da página — esse painel
  // aqui dentro só faz sentido enquanto o vídeo toma a tela toda.
  useEffect(() => {
    if (!stageFullscreen) setStageChatOpen(false);
  }, [stageFullscreen]);

  function toggleStageFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      stageRef.current?.requestFullscreen();
    }
  }

  // Os controles sobre o vídeo (sair da tela cheia, "parar de assistir")
  // somem sozinhos depois de um tempo parado e voltam assim que o mouse
  // se mexe — igual player de vídeo. Vale tanto dentro quanto fora da
  // tela cheia.
  useEffect(() => {
    setControlsVisible(true);
    hideControlsTimerRef.current = setTimeout(
      () => setControlsVisible(false),
      2500
    );

    function onActivity() {
      setControlsVisible(true);
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = setTimeout(
        () => setControlsVisible(false),
        2500
      );
    }

    const stage = stageRef.current;
    stage?.addEventListener("mousemove", onActivity);
    stage?.addEventListener("pointerdown", onActivity);

    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
      stage?.removeEventListener("mousemove", onActivity);
      stage?.removeEventListener("pointerdown", onActivity);
    };
  }, [stageFullscreen]);

  // "Parar de assistir" mora aqui (não dentro do VoiceStage) pra poder ser
  // disparado tanto pelo botão flutuante em tela cheia quanto pelo botão
  // na hotbar fora dela.
  const allScreenShareTracks = useTracks([Track.Source.ScreenShare]).filter(
    (t) => !t.publication.isMuted
  );
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

  function stopWatchingAll() {
    setHiddenSids((prev) => {
      const next = new Set(prev);
      for (const t of screenShareTracks) next.add(t.publication.trackSid);
      return next;
    });
  }

  // Reações estilo Google Meet: manda um emoji pelos dados do LiveKit e
  // todo mundo na sala vê ele subindo flutuando por cima do vídeo.
  const [reactions, setReactions] = useState<
    { id: string; emoji: string; drift: number }[]
  >([]);

  function spawnReaction(emoji: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const drift = Math.random() * 70 - 35;
    setReactions((prev) => [...prev, { id, emoji, drift }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  }

  const { send: sendReaction } = useDataChannel("reactions", (msg) => {
    spawnReaction(new TextDecoder().decode(msg.payload));
  });

  function handleSendReaction(emoji: string) {
    spawnReaction(emoji);
    sendReaction(new TextEncoder().encode(emoji), { reliable: true });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RoomAudioRenderer volume={muted ? 0 : volume} />

      {minimized && onExpand && <MiniStreamBubble onExpand={onExpand} />}

      <div className="min-h-0 flex-1 p-3 md:p-5">
        <div
          ref={stageRef}
          className={`flex h-full w-full overflow-hidden bg-black shadow-[0_0_70px_rgba(0,0,0,0.65)] ring-1 ring-white/10 ${
            stageFullscreen ? "" : "rounded-2xl"
          }`}
        >
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <VoiceStage
              channelName={channelName}
              controlsVisible={controlsVisible}
              stageFullscreen={stageFullscreen}
              screenShareTracks={screenShareTracks}
              hiddenTracks={hiddenTracks}
              onStopWatching={stopWatching}
              onResumeWatching={resumeWatching}
            />

            <ReactionsLayer reactions={reactions} />

            {stageFullscreen && chatChannel && (
              <button
                type="button"
                onClick={() => {
                  if (!stageChatOpen) onStageChatOpen?.();
                  setStageChatOpen((o) => !o);
                }}
                title={stageChatOpen ? "Fechar bastidores" : "Abrir bastidores"}
                aria-label={stageChatOpen ? "Fechar bastidores" : "Abrir bastidores"}
                className={`absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-500 hover:bg-black/50 hover:text-white ${
                  stageChatOpen ? "bg-gold/25 text-gold" : "bg-black/25 text-white/70"
                } ${
                  controlsVisible || stageChatOpen
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <ChatBubbleIcon />
              </button>
            )}

            {stageFullscreen && (
              <button
                type="button"
                onClick={toggleStageFullscreen}
                title="Sair da tela cheia (Esc)"
                aria-label="Sair da tela cheia"
                className={`absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white/70 backdrop-blur-sm transition-all duration-500 hover:bg-black/50 hover:text-white ${
                  controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <FullscreenExitIcon />
              </button>
            )}

            {stageFullscreen && (
              <div
                className={`absolute inset-x-0 bottom-0 z-20 flex justify-center pb-4 transition-opacity duration-500 ${
                  controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <VoiceControlBar
                  volume={volume}
                  muted={muted}
                  onVolumeChange={setVolume}
                  onToggleMuted={() => setMuted((m) => !m)}
                  resolution={resolution}
                  fps={fps}
                  onResolutionChange={setResolution}
                  onFpsChange={setFps}
                  stageFullscreen={stageFullscreen}
                  onToggleStageFullscreen={toggleStageFullscreen}
                  onReact={handleSendReaction}
                  watchingCount={screenShareTracks.length}
                  onStopWatchingAll={stopWatchingAll}
                  floating
                />
              </div>
            )}
          </div>

          {stageFullscreen && chatChannel && stageChatOpen && (
            <div className="flex w-full max-w-full shrink-0 flex-col bg-panel ring-1 ring-white/10 sm:w-80 sm:max-w-[40vw] lg:w-96">
              <ChatChannel
                channel={chatChannel}
                profile={profile}
                onClose={() => setStageChatOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {!stageFullscreen && (
        <div className="shrink-0 px-3 pb-4 md:px-5 md:pb-6">
          <VoiceControlBar
            volume={volume}
            muted={muted}
            onVolumeChange={setVolume}
            onToggleMuted={() => setMuted((m) => !m)}
            resolution={resolution}
            fps={fps}
            onResolutionChange={setResolution}
            onFpsChange={setFps}
            stageFullscreen={stageFullscreen}
            onToggleStageFullscreen={toggleStageFullscreen}
            onReact={handleSendReaction}
            watchingCount={screenShareTracks.length}
            onStopWatchingAll={stopWatchingAll}
          />
        </div>
      )}
    </div>
  );
}

const REACTIONS = ["❤️", "👍", "🎉", "👏", "😂", "😮", "😢", "🤔", "👎"] as const;

// Camada por cima do vídeo onde os emojis de reação sobem flutuando —
// igual Google Meet. Puramente visual, não intercepta cliques.
function ReactionsLayer({
  reactions,
}: {
  reactions: { id: string; emoji: string; drift: number }[];
}) {
  if (reactions.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="reaction-float absolute bottom-6 left-1/2 text-4xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] sm:text-5xl"
          style={
            {
              "--reaction-drift-start": `${r.drift * 0.2}px`,
              "--reaction-drift-mid": `${r.drift}px`,
              "--reaction-drift-end": `${r.drift * 1.6}px`,
            } as React.CSSProperties
          }
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

// Bolha flutuante com prévia ao vivo, arrastável, que aparece por cima do
// chat em tela cheia — clicar (sem arrastar) volta pra visão da sala.
const BUBBLE_WIDTH = 208;
const BUBBLE_HEIGHT = 152;
const BUBBLE_MARGIN = 16;

function MiniStreamBubble({ onExpand }: { onExpand: () => void }) {
  const screenTracks = useTracks([Track.Source.ScreenShare]).filter(
    (t) => !t.publication.isMuted
  );
  const cameraTracks = useTracks([Track.Source.Camera]).filter(
    (t) => !t.publication.isMuted
  );
  const previewTrack = screenTracks[0] ?? cameraTracks[0] ?? null;

  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const draggedRef = useRef(false);
  const grabOffsetRef = useRef({ x: 0, y: 0 });

  function clamp(x: number, y: number) {
    const maxX = window.innerWidth - BUBBLE_WIDTH - BUBBLE_MARGIN;
    const maxY = window.innerHeight - BUBBLE_HEIGHT - BUBBLE_MARGIN;
    return {
      x: Math.min(Math.max(BUBBLE_MARGIN, x), Math.max(BUBBLE_MARGIN, maxX)),
      y: Math.min(Math.max(BUBBLE_MARGIN, y), Math.max(BUBBLE_MARGIN, maxY)),
    };
  }

  // Aparece pela primeira vez ancorada no canto inferior direito, acima
  // da barra de digitar, sem tampar os botões de GIF/emoji.
  useEffect(() => {
    if (pos) return;
    setPos(
      clamp(
        window.innerWidth - BUBBLE_WIDTH - BUBBLE_MARGIN,
        window.innerHeight - BUBBLE_HEIGHT - 96
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clamp(p.x, p.y) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (!bubbleRef.current) return;
    draggingRef.current = true;
    draggedRef.current = false;
    const rect = bubbleRef.current.getBoundingClientRect();
    grabOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    draggedRef.current = true;
    setPos(
      clamp(
        e.clientX - grabOffsetRef.current.x,
        e.clientY - grabOffsetRef.current.y
      )
    );
  }

  function onPointerUp() {
    draggingRef.current = false;
    if (!draggedRef.current) onExpand();
  }

  if (!pos) return null;

  return createPortal(
    <div
      ref={bubbleRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ left: pos.x, top: pos.y, width: BUBBLE_WIDTH }}
      title={
        previewTrack
          ? "Arraste para mover · clique para voltar à transmissão"
          : "Arraste para mover · clique para voltar à chamada"
      }
      className="fixed z-30 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-gold/30 backdrop-blur-md transition-shadow hover:ring-gold/60 active:cursor-grabbing"
    >
      <div className="relative aspect-video w-full bg-gradient-to-br from-panel to-black">
        {previewTrack ? (
          <VideoTrack
            trackRef={previewTrack}
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gold/70">
            <SpeakerWaveIcon />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Ao vivo
        </span>
      </div>
      <div className="pointer-events-none flex items-center justify-center gap-1.5 bg-panel/95 py-1.5 text-[11px] font-medium text-white">
        <ExpandIcon />
        {previewTrack ? "Voltar para a transmissão" : "Voltar para a chamada"}
      </div>
    </div>,
    document.body
  );
}

function VoiceStage({
  channelName,
  controlsVisible,
  stageFullscreen,
  screenShareTracks,
  hiddenTracks,
  onStopWatching,
  onResumeWatching,
}: {
  channelName: string;
  controlsVisible: boolean;
  stageFullscreen: boolean;
  screenShareTracks: TrackReference[];
  hiddenTracks: TrackReference[];
  onStopWatching: (trackSid: string) => void;
  onResumeWatching: (trackSid: string) => void;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const allCameraTracks = useTracks([Track.Source.Camera]).filter(
    (t) => !t.publication.isMuted
  );

  const localCameraTrack = allCameraTracks.find(
    (t) => t.participant.identity === localParticipant.identity
  );
  const remoteCameraTracks = allCameraTracks.filter(
    (t) => t.participant.identity !== localParticipant.identity
  );

  // Alguém compartilhando tela: isso é a "tela de cinema" — vira o
  // conteúdo principal. As webcams viram uma fileira que rola na horizontal
  // por cima, então dá pra caber o grupo inteiro (7-9 pessoas) sem tampar
  // a transmissão nem estourar a tela.
  if (screenShareTracks.length > 0) {
    const orderedCameraTracks = localCameraTrack
      ? [localCameraTrack, ...remoteCameraTracks]
      : remoteCameraTracks;

    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex shrink-0 items-start gap-3 bg-black p-4 pr-16">
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="hidden text-[11px] font-bold uppercase tracking-widest text-white sm:inline">
              Em exibição
            </span>
          </div>

          {orderedCameraTracks.length > 0 && (
            <div className="cam-strip flex min-w-0 flex-1 items-center gap-3 overflow-x-auto pb-1">
              {orderedCameraTracks.map((track) => {
                const isLocal =
                  track.participant.identity === localParticipant.identity;
                return (
                  <div
                    key={track.publication.trackSid}
                    className={`relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-black shadow-lg sm:w-44 md:w-56 ${
                      isLocal
                        ? "ring-2 ring-gold/70"
                        : "ring-1 ring-white/15"
                    }`}
                  >
                    <VideoTrack
                      trackRef={track}
                      className={`h-full w-full object-cover ${
                        isLocal ? "-scale-x-100" : ""
                      }`}
                    />
                    <p
                      className={`absolute bottom-0 left-0 right-0 truncate bg-black/70 px-2 py-1 text-xs font-medium ${
                        isLocal ? "text-gold" : "text-white"
                      }`}
                    >
                      {isLocal ? "Você" : track.participant.name}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative flex min-h-0 flex-1 flex-wrap items-center justify-center gap-4 p-2">
          {screenShareTracks.map((track) => (
            <ScreenShareTile
              key={track.publication.trackSid}
              track={track}
              onStopWatching={() => onStopWatching(track.publication.trackSid)}
              controlsVisible={controlsVisible}
              showStopButton={stageFullscreen}
            />
          ))}

          <HiddenSharesBar tracks={hiddenTracks} onResume={onResumeWatching} />
        </div>
      </div>
    );
  }

  // Só webcams, sem ninguém compartilhando tela: os blocos ficam grandes,
  // num grid que se ajusta à quantidade de gente.
  if (allCameraTracks.length === 1) {
    const track = allCameraTracks[0];
    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <VideoTrack
          trackRef={track}
          className={`h-full w-full object-cover ${
            track.participant.identity === localParticipant.identity
              ? "-scale-x-100"
              : ""
          }`}
        />
        <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs font-medium text-white">
          {track.participant.name}
        </p>

        <HiddenSharesBar tracks={hiddenTracks} onResume={onResumeWatching} />
      </div>
    );
  }

  if (allCameraTracks.length > 0) {
    return (
      <div className="flex h-full flex-col gap-3 overflow-y-auto bg-gradient-to-b from-black to-panel/40 p-4">
        <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-3">
          {allCameraTracks.map((track) => (
            <div
              key={track.publication.trackSid}
              className="relative aspect-video h-full max-h-full w-auto max-w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10"
            >
              <VideoTrack
                trackRef={track}
                className={`h-full w-full object-cover ${
                  track.participant.identity === localParticipant.identity
                    ? "-scale-x-100"
                    : ""
                }`}
              />
              <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs font-medium text-white">
                {track.participant.name}
              </p>
            </div>
          ))}
        </div>

        <HiddenSharesBar
          tracks={hiddenTracks}
          onResume={onResumeWatching}
          inline
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto bg-gradient-to-b from-panel/60 to-black p-6 sm:p-8">
      <div>
        <p className="mb-4 text-center font-display text-sm uppercase tracking-[0.3em] text-muted">
          Aguardando sessão
        </p>
        <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
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

      <HiddenSharesBar tracks={hiddenTracks} onResume={onResumeWatching} inline />
    </div>
  );
}

function HiddenSharesBar({
  tracks,
  onResume,
  inline = false,
}: {
  tracks: TrackReference[];
  onResume: (trackSid: string) => void;
  inline?: boolean;
}) {
  if (tracks.length === 0) return null;

  return (
    <div
      className={`z-10 flex shrink-0 flex-wrap items-center justify-center gap-3 ${
        inline
          ? "w-full px-2"
          : "absolute bottom-4 left-1/2 -translate-x-1/2 px-4"
      }`}
    >
      {tracks.map((track) => (
        <button
          key={track.publication.trackSid}
          type="button"
          onClick={() => onResume(track.publication.trackSid)}
          title={`Assistir a tela de ${track.participant.name} de novo`}
          className="group w-full max-w-[180px] overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-gold/30 backdrop-blur-md transition hover:ring-gold/60 sm:max-w-[208px]"
        >
          <div className="relative aspect-video w-full bg-gradient-to-br from-panel to-black">
            <VideoTrack
              trackRef={track}
              className="pointer-events-none h-full w-full object-cover opacity-60 transition group-hover:opacity-80"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Ao vivo
            </span>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/80 opacity-0 transition group-hover:opacity-100">
              <PlayCircleIcon />
            </span>
          </div>
          <div className="flex flex-col items-start gap-0.5 bg-panel/95 px-3 py-2 text-left">
            <span className="text-xs font-semibold text-white">
              Clique para assistir novamente
            </span>
            <span className="truncate text-[11px] text-muted">
              {track.participant.name} está transmitindo
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function PlayCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ScreenShareTile({
  track,
  onStopWatching,
  controlsVisible,
  showStopButton,
}: {
  track: TrackReference;
  onStopWatching: () => void;
  controlsVisible: boolean;
  showStopButton: boolean;
}) {
  return (
    <div className="group relative flex h-full max-h-full w-full max-w-full flex-1 flex-col overflow-hidden">
      <VideoTrack
        trackRef={track}
        className="h-full w-full flex-1 object-contain"
      />
      <p
        className={`absolute bottom-0 left-0 bg-black/60 px-2 py-1 text-xs text-white transition-opacity duration-500 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {track.participant.name} está transmitindo
      </p>
      {showStopButton && (
        <button
          type="button"
          onClick={onStopWatching}
          title="Parar de assistir"
          aria-label="Parar de assistir"
          className={`absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-all duration-500 hover:bg-black/80 ${
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <StopWatchingIcon />
        </button>
      )}
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
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xl font-bold text-white ring-2 ring-white/10">
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
  stageFullscreen,
  onToggleStageFullscreen,
  onReact,
  watchingCount,
  onStopWatchingAll,
  floating = false,
}: {
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMuted: () => void;
  resolution: ResolutionKey;
  fps: FpsKey;
  onResolutionChange: (r: ResolutionKey) => void;
  onFpsChange: (f: FpsKey) => void;
  stageFullscreen: boolean;
  onToggleStageFullscreen: () => void;
  onReact: (emoji: string) => void;
  watchingCount: number;
  onStopWatchingAll: () => void;
  floating?: boolean;
}) {
  const { isCameraEnabled, isScreenShareEnabled, localParticipant } =
    useLocalParticipant();
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reactMenuOpen, setReactMenuOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const reactButtonRef = useRef<HTMLButtonElement>(null);

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
        {
          // H.264 usa o encoder de hardware do navegador/SO em vez de
          // software (VP8) — é o que segura 1440p60 sem fritar a CPU de
          // quem compartilha. backupCodec mantém VP8 como reserva pra
          // quem não suportar H.264, sem custo extra pro publisher.
          videoCodec: "h264",
          backupCodec: true,
          // Simulcast é o que impede a transmissão de travar do lado de
          // quem assiste. Sem ele existe uma camada só, no bitrate cheio:
          // se o download de alguém (ou o upload de quem transmite) não
          // segura aquele valor, o servidor não tem nada menor pra mandar
          // e a imagem congela em vez de perder qualidade. Com a camada
          // baixa publicada junto, quem está com banda ruim cai pra ela e
          // continua fluido, sem afetar quem está bem.
          simulcast: true,
          screenShareSimulcastLayers: [ScreenSharePresets.h360fps15],
          screenShareEncoding: {
            maxBitrate: SCREEN_SHARE_BITRATE[resolution][fps],
            maxFramerate: fps,
          },
          // Assistindo vídeo/filme junto, fluidez importa mais que nitidez
          // pixel-perfect — se faltar banda, prefere manter os 60fps a
          // manter a resolução exata.
          degradationPreference: "maintain-framerate",
        }
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

  return (
    <div
      className={`mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl px-2 py-2 shadow-2xl ring-1 backdrop-blur-md sm:gap-1.5 sm:px-3 ${
        floating
          ? "bg-black/25 ring-white/10"
          : "bg-panel/90 shadow-2xl ring-white/10 backdrop-blur-xl"
      }`}
    >
      <TrackToggle
        source={Track.Source.Camera}
        showIcon={false}
        title={isCameraEnabled ? "Desligar webcam" : "Ligar webcam"}
        className={dockButtonClass(isCameraEnabled)}
        style={
          isCameraEnabled
            ? { backgroundColor: "rgba(212,175,55,0.15)" }
            : undefined
        }
      >
        <CameraIcon />
        <DockLabel>Webcam</DockLabel>
      </TrackToggle>

      <button
        ref={shareButtonRef}
        type="button"
        title={isScreenShareEnabled ? "Parar compartilhamento" : "Compartilhar tela"}
        aria-label={isScreenShareEnabled ? "Parar compartilhamento" : "Compartilhar tela"}
        onClick={handleScreenShareClick}
        className={dockButtonClass(isScreenShareEnabled || shareMenuOpen)}
      >
        <ScreenShareIcon />
        <DockLabel>Tela</DockLabel>
      </button>

      {shareMenuOpen && !isScreenShareEnabled && (
        <AnchoredPopover
          anchorRef={shareButtonRef}
          onClose={() => setShareMenuOpen(false)}
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">
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
                    ? "bg-gold text-black font-semibold"
                    : "bg-white/5 text-muted hover:text-white"
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
                    ? "bg-gold text-black font-semibold"
                    : "bg-white/5 text-muted hover:text-white"
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
        <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5">
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
            className="w-14 accent-gold sm:w-20"
            aria-label="Volume"
          />
        </div>
      )}

      {watchingCount > 0 && (
        <button
          type="button"
          title="Parar de assistir"
          aria-label="Parar de assistir"
          onClick={onStopWatchingAll}
          className={dockButtonClass(false)}
        >
          <StopWatchingIcon />
          <DockLabel>Parar</DockLabel>
        </button>
      )}

      <button
        ref={reactButtonRef}
        type="button"
        title="Reagir"
        aria-label="Reagir"
        onClick={() => setReactMenuOpen((o) => !o)}
        className={dockButtonClass(reactMenuOpen)}
      >
        <ReactionIcon />
        <DockLabel>Reagir</DockLabel>
      </button>

      {reactMenuOpen && (
        <AnchoredPopover
          anchorRef={reactButtonRef}
          onClose={() => setReactMenuOpen(false)}
        >
          <div className="grid grid-cols-5 gap-1">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setReactMenuOpen(false);
                }}
                title={`Reagir com ${emoji}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:scale-125 hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        </AnchoredPopover>
      )}

      <button
        type="button"
        title={stageFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        aria-label={stageFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        onClick={onToggleStageFullscreen}
        className={dockButtonClass(stageFullscreen)}
      >
        {stageFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        <DockLabel>Tela cheia</DockLabel>
      </button>

      <div className="mx-1 hidden h-8 w-px bg-white/10 sm:block" />

      <DisconnectButton
        title="Sair da sala"
        className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl bg-accent px-3 text-white transition hover:bg-accentHover sm:h-12 sm:px-4"
      >
        <LeaveIcon />
        <DockLabel danger>Sair</DockLabel>
      </DisconnectButton>
    </div>
  );
}

function DockLabel({
  children,
  danger,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <span
      className={`hidden text-[10px] font-medium leading-none sm:block ${
        danger ? "text-white" : ""
      }`}
    >
      {children}
    </span>
  );
}

// Renderiza fixo em document.body posicionado perto do botão, pra nunca
// ficar cortado por painéis estreitos (que têm overflow limitado).
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
      className="fixed z-50 rounded-lg bg-panel p-3 text-sm shadow-xl ring-1 ring-gold/20"
    >
      {children}
    </div>,
    document.body
  );
}

function dockButtonClass(active: boolean) {
  return `flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl transition sm:h-12 sm:w-16 ${
    active
      ? "bg-gold/15 text-gold ring-1 ring-gold/40"
      : "text-muted hover:bg-white/5 hover:text-white"
  }`;
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function SpeakerWaveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
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

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ReactionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
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
