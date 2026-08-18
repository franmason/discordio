"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSavedProfile, clearProfile } from "@/lib/session";
import { supabase, Channel, Profile } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import ChatChannel from "@/components/ChatChannel";
import VoiceChannel from "@/components/VoiceChannel";

export default function ServerPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const saved = getSavedProfile();
    if (!saved) {
      router.push("/");
      return;
    }
    setProfile(saved);
  }, [router]);

  useEffect(() => {
    async function loadChannels() {
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("position", { ascending: true });
      if (data) {
        setChannels(data as Channel[]);
        const firstText = data.find((c) => c.type === "text");
        if (firstText) setActiveChannel(firstText as Channel);
      }
    }
    loadChannels();
  }, []);

  function handleSwitchProfile() {
    clearProfile();
    router.push("/");
  }

  if (!profile) return null;

  return (
    <div className="flex h-full w-full">
      <Sidebar
        channels={channels}
        activeChannelId={activeChannel?.id ?? null}
        onSelect={setActiveChannel}
        profile={profile}
        onSwitchProfile={handleSwitchProfile}
      />
      <main className="flex-1 bg-panelLight">
        {activeChannel?.type === "text" && (
          <ChatChannel channel={activeChannel} profile={profile} />
        )}
        {activeChannel?.type === "voice" && (
          <VoiceChannel channel={activeChannel} profile={profile} />
        )}
        {!activeChannel && (
          <div className="flex h-full items-center justify-center text-muted">
            Escolha um canal
          </div>
        )}
      </main>
    </div>
  );
}
