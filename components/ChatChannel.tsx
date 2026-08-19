"use client";

import { useEffect, useRef, useState } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { supabase, Channel, Message, Profile } from "@/lib/supabase";
import { Avatar } from "@/components/Sidebar";
import MessageContent from "@/components/MessageContent";
import GifPicker from "@/components/GifPicker";

export default function ChatChannel({
  channel,
  profile,
}: {
  channel: Channel;
  profile: Profile;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function insertMessage(content: string, imageUrl?: string | null) {
    await supabase.from("messages").insert({
      channel_id: channel.id,
      author_id: profile.id,
      author_name: profile.name,
      author_avatar_url: profile.avatar_url,
      content,
      image_url: imageUrl ?? null,
    });
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    await insertMessage(content);
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Imagem muito grande (máx. 8MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${profile.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-uploads")
        .upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("chat-uploads").getPublicUrl(path);
      await insertMessage("", data.publicUrl);
    } catch (err) {
      console.error(err);
      alert("Não deu pra enviar a imagem. Tenta de novo.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = "";
  }

  // Cola um print direto (Ctrl+V) e já sobe como imagem
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/")
    );
    if (!item) return;
    const file = item.getAsFile();
    if (file) {
      e.preventDefault();
      uploadImage(file);
    }
  }

  function handleEmojiClick(data: EmojiClickData) {
    setText((prev) => prev + data.emoji);
  }

  async function handleGifSelect(gifUrl: string) {
    setShowGifPicker(false);
    await insertMessage("", gifUrl);
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
              <MessageContent content={m.content} imageUrl={m.image_url} />
            </div>
          </div>
        ))}
        {uploading && (
          <div className="mb-3 text-xs text-muted">Enviando imagem...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="relative px-4 pb-4">
        {showEmoji && (
          <div className="absolute bottom-14 right-4 z-10">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={Theme.DARK}
              lazyLoadEmojis
            />
          </div>
        )}
        {showGifPicker && (
          <div className="absolute bottom-14 right-4 z-10">
            <GifPicker
              onSelect={handleGifSelect}
              onClose={() => setShowGifPicker(false)}
            />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-panelLight px-2">
          <button
            type="button"
            title="Enviar imagem/print"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded p-2 text-lg text-muted hover:text-white"
          >
            ＋
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            placeholder={`Conversar em #${channel.name}`}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-muted"
          />

          <button
            type="button"
            title="GIF"
            onClick={() => {
              setShowGifPicker((v) => !v);
              setShowEmoji(false);
            }}
            className="shrink-0 rounded px-2 py-1 text-xs font-bold text-muted hover:text-white"
          >
            GIF
          </button>
          <button
            type="button"
            title="Emoji"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowGifPicker(false);
            }}
            className="shrink-0 rounded p-2 text-lg text-muted hover:text-white"
          >
            🙂
          </button>
        </div>
      </form>
    </div>
  );
}
