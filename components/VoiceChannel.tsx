"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
} from "@livekit/components-react";
import { Channel, Profile } from "@/lib/supabase";

export default function VoiceChannel({
  channel,
  profile,
}: {
  channel: Channel;
  profile: Profile;
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
      <div className="flex-1 bg-black/20">
        <LiveKitRoom
          key={channel.id}
          token={token}
          serverUrl={livekitUrl}
          connect={true}
          video={false}
          audio={true}
          data-lk-theme="default"
          style={{ height: "100%" }}
        >
          <VideoConference chatMessageFormatter={formatChatMessageLinks} />
        </LiveKitRoom>
      </div>
    </div>
  );
}
