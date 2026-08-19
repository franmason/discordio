"use client";

import { useState } from "react";
import { supabase, Profile } from "@/lib/supabase";
import { Avatar } from "@/components/Sidebar";

export default function ProfileSettingsModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.avatar_url
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolhe um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande (máx. 5MB)");
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Coloca um nome com pelo menos 2 letras");
      return;
    }
    if (trimmedName.length > 24) {
      setError("Nome muito longo (máx. 24 caracteres)");
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${profile.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        avatarUrl = publicUrlData.publicUrl;
      }

      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({ name: trimmedName, avatar_url: avatarUrl })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateError || !updated) {
        if (updateError?.code === "23505") {
          setError("Já existe alguém com esse nome. Escolhe outro.");
        } else {
          setError("Não deu pra salvar. Tenta de novo.");
        }
        return;
      }

      onSaved(updated as Profile);
      onClose();
    } catch {
      setError("Não deu pra salvar. Tenta de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg bg-panel p-6 shadow-xl"
      >
        <h2 className="mb-1 text-lg font-semibold text-white">Editar perfil</h2>
        <p className="mb-5 text-sm text-muted">
          Isso aparece pros outros no chat e na chamada de voz.
        </p>

        <div className="mb-5 flex items-center gap-4">
          <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-base ring-1 ring-white/10">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Prévia da foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <Avatar profile={{ ...profile, name }} size={64} />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <p className="text-xs text-muted">
            Clica no círculo pra trocar a foto.
          </p>
        </div>

        <label className="mb-2 block text-xs font-bold uppercase text-muted">
          Nome
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-1 w-full rounded-md border-none bg-base px-3 py-2.5 text-white outline-none ring-1 ring-transparent focus:ring-accent"
        />
        {error && <p className="mb-2 mt-2 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-muted hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accentHover disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
