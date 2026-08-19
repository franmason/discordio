"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, signOut } from "@/lib/session";
import { supabase, Channel, Profile } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import ChatChannel from "@/components/ChatChannel";
import VoiceChannel from "@/components/VoiceChannel";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";

export default function ServerPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

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
        const firstText = data.find((c) => c.type === "text");
        if (firstText) setActiveChannel(firstText as Channel);
      }
    }
    loadChannels();
  }, []);

  async function handleSignOut() {
    await signOut();
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
        onSignOut={handleSignOut}
        voiceConnected={activeChannel?.type === "voice"}
        voiceChannelName={activeChannel?.type === "voice" ? activeChannel.name : null}
        onOpenProfile={() => setEditingProfile(true)}
      />
      <main className="flex-1 bg-panelLight">
        {activeChannel?.type === "text" && (
          <ChatChannel channel={activeChannel} profile={profile} />
        )}
        {activeChannel?.type === "voice" && (
          <VoiceChannel
            channel={activeChannel}
            profile={profile}
            onLeave={() => setActiveChannel(null)}
          />
        )}
        {!activeChannel && (
          <div className="flex h-full items-center justify-center text-muted">
            Escolha um canal
          </div>
        )}
      </main>

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
