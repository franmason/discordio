import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const identity = req.nextUrl.searchParams.get("identity");
  const name = req.nextUrl.searchParams.get("name");
  const avatar = req.nextUrl.searchParams.get("avatar");

  if (!room || !identity || !name) {
    return NextResponse.json(
      { error: "Faltam parâmetros: room, identity, name" },
      { status: 400 }
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LIVEKIT_API_KEY / LIVEKIT_API_SECRET não configurados" },
      { status: 500 }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: "6h",
    // Foto do perfil disponível pra quem quiser exibir no participante
    // (ex: um overlay customizado sobre o tile de vídeo do LiveKit)
    metadata: avatar ? JSON.stringify({ avatar_url: avatar }) : undefined,
  });

  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token });
}
