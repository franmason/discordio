"use client";

import { useEffect, useRef, useState } from "react";
import EmojiPicker, { EmojiClickData, EmojiStyle, Theme } from "emoji-picker-react";
import { supabase, Channel, Message, Profile } from "@/lib/supabase";
import { Avatar } from "@/components/Sidebar";
import MessageContent from "@/components/MessageContent";
import GifPicker from "@/components/GifPicker";
import ConfirmDialog, { DialogState } from "@/components/ConfirmDialog";

export default function ChatChannel({
  channel,
  profile,
  onClose,
}: {
  channel: Channel;
  profile: Profile;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as Message).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(sub);
    };
  }, [channel.id]);

  // Mostra nome/foto ATUAIS de quem mandou cada mensagem (não a cópia
  // salva no momento do envio) — então trocar de perfil atualiza até
  // mensagens antigas. Assina realtime pra refletir na hora pros outros.
  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      const { data } = await supabase.from("profiles").select("*");
      if (active && data) {
        const map: Record<string, Profile> = {};
        for (const p of data as Profile[]) map[p.id] = p;
        setProfilesById(map);
      }
    }
    loadProfiles();

    const sub = supabase
      .channel("profiles:all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          setProfilesById((prev) => {
            const next = { ...prev };
            if (payload.eventType === "DELETE") {
              delete next[(payload.old as Profile).id];
            } else {
              const updated = payload.new as Profile;
              next[updated.id] = updated;
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(sub);
    };
  }, []);

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
    await sendCurrentMessage();
  }

  async function sendCurrentMessage() {
    const content = text.trim();
    if (!content) return;
    setText("");
    await insertMessage(content);
  }

  // O seletor de emoji tem o próprio tratamento de teclado (navegação,
  // busca) que pode interceptar o Enter antes dele "borbulhar" até o
  // formulário. Tratando o Enter aqui, no próprio campo, e cortando a
  // propagação, garante que enviar funciona mesmo com o seletor aberto.
  function handleMessageInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    setShowEmoji(false);
    sendCurrentMessage();
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) {
      setDialog({ kind: "alert", message: "Imagem muito grande (máx. 8MB)" });
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
      setDialog({
        kind: "alert",
        message: "Não deu pra enviar a imagem. Tenta de novo.",
      });
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
    // O seletor rouba o foco do teclado ao clicar num emoji — sem devolver
    // pro campo de texto, apertar Enter depois não envia nada, porque o
    // foco não está mais dentro do formulário da mensagem.
    messageInputRef.current?.focus();
  }

  async function handleGifSelect(gifUrl: string) {
    setShowGifPicker(false);
    await insertMessage("", gifUrl);
  }

  function startEdit(m: Message) {
    setEditingId(m.id);
    setEditText(m.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(id: string) {
    const content = editText.trim();
    if (!content) return;
    const { error } = await supabase
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      setDialog({
        kind: "alert",
        message: "Não deu pra editar a mensagem. Tenta de novo.",
      });
      return;
    }
    setEditingId(null);
    setEditText("");
  }

  function deleteMessage(id: string) {
    setDialog({
      kind: "confirm",
      message: "Apagar essa mensagem?",
      onConfirm: async () => {
        const { error } = await supabase.from("messages").delete().eq("id", id);
        if (error) {
          setDialog({
            kind: "alert",
            message: "Não deu pra apagar a mensagem. Tenta de novo.",
          });
        }
      },
    });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <ConfirmDialog state={dialog} onClose={() => setDialog(null)} />
      <div className="flex h-14 items-center gap-2 border-b border-white/5 px-4 shadow-sm md:h-16">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Chat da Sala
          </p>
          <p className="truncate font-display text-lg uppercase tracking-wider text-white">
            {channel.name}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="shrink-0 rounded-md p-2 text-muted hover:bg-white/5 hover:text-white"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
        {messages.map((m) => {
          const currentAuthor = m.author_id ? profilesById[m.author_id] : null;
          const displayName = currentAuthor?.name ?? m.author_name;
          const displayAvatar = currentAuthor
            ? currentAuthor.avatar_url
            : m.author_avatar_url;

          const isOwn = m.author_id === profile.id;
          const isEditing = editingId === m.id;

          return (
            <div
              key={m.id}
              className="group relative mb-3 flex gap-3 rounded px-2 py-1 -mx-2 hover:bg-black/10"
            >
              <div className="mt-0.5">
                <Avatar
                  profile={{
                    id: m.author_id ?? m.id,
                    name: displayName,
                    avatar_url: displayAvatar,
                    created_at: m.created_at,
                  }}
                  size={36}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-white">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-muted">
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {m.edited_at && (
                    <span className="text-[11px] text-muted">(editado)</span>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-1 flex flex-col gap-1.5">
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit(m.id);
                        } else if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      className="w-full rounded-md bg-base px-2 py-1.5 text-sm text-white outline-none ring-1 ring-accent"
                    />
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => saveEdit(m.id)}
                        className="text-accent hover:underline"
                      >
                        salvar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-muted hover:underline"
                      >
                        cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <MessageContent content={m.content} imageUrl={m.image_url} />
                )}
              </div>

              {isOwn && !isEditing && (
                <div className="absolute right-2 top-1 hidden items-start gap-1 rounded bg-panelLight/90 shadow-sm group-hover:flex">
                  {!m.image_url && (
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => startEdit(m)}
                      className="rounded p-1 text-muted hover:bg-panelLight hover:text-white"
                    >
                      <EditIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Apagar"
                    onClick={() => deleteMessage(m.id)}
                    className="rounded p-1 text-muted hover:bg-panelLight hover:text-red-400"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
              emojiStyle={EmojiStyle.NATIVE}
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

        <div className="flex items-center gap-2 rounded-lg bg-panelLight px-2 shadow-md ring-1 ring-black/10 transition focus-within:ring-2 focus-within:ring-accent">
          <button
            type="button"
            title="Enviar imagem/print"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded p-2 text-muted hover:text-white"
          >
            <PlusIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <input
            ref={messageInputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleMessageInputKeyDown}
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
            className="shrink-0 rounded p-2 text-muted hover:text-white"
          >
            <SmileyIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SmileyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
