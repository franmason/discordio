"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, Channel, Message, Profile } from "@/lib/supabase";
import { Avatar } from "@/components/Sidebar";

export default function ChatChannel({
  channel,
  profile,
}: {
  channel: Channel;
  profile: Profile;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Carrega histórico + assina realtime pro canal atual
  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channel.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (active && data) setMessages(data as Message[]);
    }
    loadHistory();

    const sub = supabase
      .channel(`messages:${channel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(sub);
    };
  }, [channel.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    await supabase.from("messages").insert({
      channel_id: channel.id,
      author_id: profile.id,
      author_name: profile.name,
      author_avatar_url: profile.avatar_url,
      content,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b border-black/20 px-4 font-semibold shadow-sm">
        # {channel.name}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <div key={m.id} className="mb-3 flex gap-3">
            <div className="mt-0.5">
              <Avatar
                profile={{
                  id: m.author_id ?? m.id,
                  name: m.author_name,
                  avatar_url: m.author_avatar_url,
                  created_at: m.created_at,
                }}
                size={36}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-white">
                  {m.author_name}
                </span>
                <span className="text-[11px] text-muted">
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-100">
                {m.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="px-4 pb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Conversar em #${channel.name}`}
          className="w-full rounded-lg bg-panelLight px-4 py-2.5 text-sm text-white outline-none placeholder:text-muted"
        />
      </form>
    </div>
  );
}
