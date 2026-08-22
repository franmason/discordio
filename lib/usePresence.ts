"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Presença "quem está no app agora" via canal de Realtime do Supabase —
// diferente do useVoiceParticipants (que só olha quem está numa sala de
// voz específica). Todo mundo logado entra nesse canal compartilhado e
// afirma "estou aqui" (track); quando a aba fecha ou a conexão cai, o
// Supabase remove a presença sozinho, sem precisar de heartbeat manual.
export function usePresence(profileId: string | null | undefined) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId) {
      setOnlineIds(new Set());
      return;
    }

    const channel = supabase.channel("presence:app", {
      config: { presence: { key: profileId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return onlineIds;
}
