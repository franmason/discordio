import { RoomServiceClient } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

// Converte a URL de WebSocket do LiveKit (wss://...) pra URL http(s),
// que é o formato que o RoomServiceClient espera.
function toHttpUrl(wsUrl: string) {
  return wsUrl.replace(/^ws/, "http");
}

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "Falta o parâmetro room" }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json(
      { error: "Variáveis do LiveKit não configuradas" },
      { status: 500 }
    );
  }

  const svc = new RoomServiceClient(toHttpUrl(livekitUrl), apiKey, apiSecret);

  try {
    const participants = await svc.listParticipants(room);

    const result = participants.map((p) => {
      let avatarUrl: string | null = null;
      if (p.metadata) {
        try {
          avatarUrl = JSON.parse(p.metadata).avatar_url ?? null;
        } catch {
          avatarUrl = null;
        }
      }

      const audioTrack = p.tracks.find((t) => t.type === 1 /* AUDIO */);

      return {
        identity: p.identity,
        name: p.name || p.identity,
        avatarUrl,
        // Sem publicar áudio ainda = mic desligado/não conectado.
        // Publicando mas com "muted: true" = mutado manualmente.
        hasAudio: Boolean(audioTrack),
        muted: audioTrack ? audioTrack.muted : true,
      };
    });

    return NextResponse.json({ participants: result });
  } catch (err: any) {
    // A sala pode simplesmente não existir ainda (ninguém entrou) —
    // isso não é um erro de verdade, só significa "sala vazia".
    if (err?.message?.includes("not found") || err?.status === 404) {
      return NextResponse.json({ participants: [] });
    }
    return NextResponse.json(
      { error: err.message || "Falha ao listar participantes" },
      { status: 500 }
    );
  }
}
