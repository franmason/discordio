"use client";

import { useEffect, useState } from "react";

export type VoiceParticipant = {
  identity: string;
  name: string;
  avatarUrl: string | null;
  hasAudio: boolean;
  muted: boolean;
};

// Fica de olho em quem está em cada canal de voz, pra mostrar a listinha
// no sidebar igual o Discord — mesmo pra quem não entrou na call ainda.
// Poll simples (a cada 4s) é suficiente pra um grupo pequeno de amigos.
export function useVoiceParticipants(roomId: string | null | undefined) {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  useEffect(() => {
    if (!roomId) {
      setParticipants([]);
      return;
    }

    let active = true;

    async function fetchParticipants() {
      try {
        const res = await fetch(
          `/api/voice-participants?room=${encodeURIComponent(roomId as string)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.participants)) {
          setParticipants(data.participants);
        }
      } catch {
        // Sem sorte nessa rodada, tenta de novo no próximo poll
      }
    }

    fetchParticipants();
    const interval = setInterval(fetchParticipants, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomId]);

  return participants;
}
