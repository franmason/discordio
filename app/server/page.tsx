"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, signOut } from "@/lib/session";
import { supabase, Channel, Profile } from "@/lib/supabase";
import { useVoiceParticipants } from "@/lib/useVoiceParticipants";
import Sidebar from "@/components/Sidebar";
import CinemaHeader from "@/components/CinemaHeader";
import ChatChannel from "@/components/ChatChannel";
import VoiceChannel from "@/components/VoiceChannel";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import CurtainIntro from "@/components/CurtainIntro";

// Evita montar o ChatChannel duas vezes ao mesmo tempo (painel desktop +
// bottom sheet mobile) — cada instância assina o mesmo canal realtime do
// Supabase, e assinar o mesmo tópico duas vezes derruba o chat inteiro.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export default function ServerPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeRoom, setActiveRoom] = useState<Channel | null>(null);
  const [chatChannel, setChatChannel] = useState<Channel | null>(null);
  const [fullChatChannel, setFullChatChannel] = useState<Channel | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const isDesktop = useIsDesktop();

  const viewers = useVoiceParticipants(activeRoom?.id ?? null);

  useEffect(() => {
    async function loadProfile() {
      const current = await getCurrentProfile();
      if (!current) {
        router.push("/");
        return;
      }
      setProfile(current);
    }
    loadProfile();
  }, [router]);

  useEffect(() => {
    async function loadChannels() {
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("position", { ascending: true });
      if (data) {
        setChannels(data as Channel[]);
        const firstVoice = data.find((c) => c.type === "voice");
        if (firstVoice) setActiveRoom(firstVoice as Channel);
      }
    }
    loadChannels();
  }, []);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  function toggleChat() {
    if (chatChannel) {
      setChatChannel(null);
      return;
    }
    const firstText = channels.find((c) => c.type === "text");
    if (firstText) {
      setFullChatChannel(null);
      setChatChannel(firstText);
    }
  }

  if (!profile) return null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-base">
      <CurtainIntro />

      <Sidebar
        channels={channels}
        activeRoomId={activeRoom?.id ?? null}
        onSelectRoom={(c) => {
          setActiveRoom(c);
          setFullChatChannel(null);
          setChatChannel(null);
          setMobileNavOpen(false);
        }}
        onOpenChat={(c) => {
          setChatChannel(null);
          setFullChatChannel(c);
          setMobileNavOpen(false);
        }}
        profile={profile}
        onSignOut={handleSignOut}
        onOpenProfile={() => setEditingProfile(true)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <CinemaHeader
          channel={activeRoom}
          isLive={Boolean(activeRoom)}
          viewerCount={viewers.length}
          onOpenRooms={() => setMobileNavOpen(true)}
          onToggleChat={toggleChat}
          chatOpen={Boolean(chatChannel || fullChatChannel)}
        />

        <div className="relative flex min-h-0 flex-1">
          <main
            className={`min-w-0 flex-1 ${fullChatChannel ? "hidden" : ""}`}
          >
            {activeRoom ? (
              <VoiceChannel
                channel={activeRoom}
                profile={profile}
                minimized={Boolean(fullChatChannel)}
                onExpand={() => setFullChatChannel(null)}
                chatChannel={channels.find((c) => c.type === "text" && c.name === "geral") ?? null}
                onStageChatOpen={() => {
                  setChatChannel(null);
                  setFullChatChannel(null);
                }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted">
                <p className="font-display text-xl uppercase tracking-widest text-white">
                  Nenhuma sala disponível
                </p>
                <p className="text-sm">
                  Crie uma sala de voz pra começar uma sessão.
                </p>
              </div>
            )}
          </main>

          {fullChatChannel && (
            <div className="absolute inset-0 z-10 flex bg-panel">
              <ChatChannel
                channel={fullChatChannel}
                profile={profile}
                onClose={() => setFullChatChannel(null)}
              />
            </div>
          )}

          {chatChannel && !fullChatChannel && isDesktop && (
            <div className="flex w-96 shrink-0 border-l border-white/5 bg-panel">
              <ChatChannel
                channel={chatChannel}
                profile={profile}
                onClose={() => setChatChannel(null)}
              />
            </div>
          )}
        </div>
      </div>

      {chatChannel && !fullChatChannel && !isDesktop && (
        <div className="fixed inset-0 z-50 flex">
          <div
            onClick={() => setChatChannel(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative mt-auto flex h-[82vh] w-full flex-col rounded-t-2xl bg-panel shadow-2xl ring-1 ring-white/10">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15" />
            <ChatChannel
              channel={chatChannel}
              profile={profile}
              onClose={() => setChatChannel(null)}
            />
          </div>
        </div>
      )}

      {editingProfile && (
        <ProfileSettingsModal
          profile={profile}
          onClose={() => setEditingProfile(false)}
          onSaved={setProfile}
        />
      )}
    </div>
  );
}
