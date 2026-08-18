"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Profile } from "@/lib/supabase";
import { getSavedProfile, saveProfile, clearProfile } from "@/lib/session";

type Mode = "loading" | "picker" | "create";

export default function EntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState("");

  // Campos do formulário de criação
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    const saved = getSavedProfile();
    if (saved) {
      // Confirma que o perfil ainda existe no banco e traz os dados mais recentes
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", saved.id)
        .maybeSingle();

      if (!fetchError && data) {
        saveProfile(data as Profile);
        router.push("/server");
        return;
      }
      clearProfile();
    }
    await loadProfiles();
    setMode("picker");
  }

  async function loadProfiles() {
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .order("name", { ascending: true });
    if (!fetchError && data) setProfiles(data as Profile[]);
  }

  function selectProfile(profile: Profile) {
    saveProfile(profile);
    router.push("/server");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Coloca um nome com pelo menos 2 letras");
      return;
    }
    if (trimmed.length > 24) {
      setError("Nome muito longo (máx. 24 caracteres)");
      return;
    }

    setSubmitting(true);
    setError("");

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({ name: trimmed })
      .select()
      .single();

    if (insertError || !newProfile) {
      setSubmitting(false);
      if (insertError?.code === "23505") {
        setError("Já existe alguém com esse nome. Escolhe outro.");
      } else {
        setError("Não deu pra criar o perfil. Tenta de novo.");
      }
      return;
    }

    let finalProfile = newProfile as Profile;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const path = `${finalProfile.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        const { data: updated } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrlData.publicUrl })
          .eq("id", finalProfile.id)
          .select()
          .single();

        if (updated) finalProfile = updated as Profile;
      }
      // Se o upload falhar, segue com o perfil sem foto em vez de travar o cadastro
    }

    setSubmitting(false);
    saveProfile(finalProfile);
    router.push("/server");
  }

  if (mode === "loading") {
    return (
      <main className="flex h-full w-full items-center justify-center bg-base">
        <p className="text-sm text-muted">Carregando...</p>
      </main>
    );
  }

  if (mode === "create") {
    return (
      <main className="flex h-full w-full items-center justify-center bg-base">
        <form
          onSubmit={handleCreate}
          className="w-full max-w-sm rounded-lg bg-panel p-8 shadow-xl"
        >
          <h1 className="mb-1 text-xl font-semibold text-white">
            Criar perfil
          </h1>
          <p className="mb-6 text-sm text-muted">
            Nome e foto ficam salvos pra sempre, em qualquer aparelho.
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
                <span className="text-xs text-muted">Foto</span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <p className="text-xs text-muted">
              Opcional. Clica no círculo pra escolher uma imagem.
            </p>
          </div>

          <label className="mb-2 block text-xs font-bold uppercase text-muted">
            Seu nome
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Chico"
            className="mb-1 w-full rounded-md border-none bg-base px-3 py-2.5 text-white outline-none ring-1 ring-transparent focus:ring-accent"
          />
          {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-md bg-accent py-2.5 font-medium text-white transition hover:bg-accentHover disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar e entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMode("picker");
            }}
            className="mt-2 w-full rounded-md py-2 text-sm text-muted hover:text-white"
          >
            Voltar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex h-full w-full items-center justify-center bg-base">
      <div className="w-full max-w-sm rounded-lg bg-panel p-8 shadow-xl">
        <h1 className="mb-1 text-xl font-semibold text-white">
          Quem é você?
        </h1>
        <p className="mb-6 text-sm text-muted">
          Escolhe seu perfil pra entrar na sala.
        </p>

        {profiles.length > 0 && (
          <div className="mb-4 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProfile(p)}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-panelLight"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-bold text-white">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={`Foto de perfil de ${p.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    p.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="text-sm font-medium text-white">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {profiles.length === 0 && (
          <p className="mb-4 text-sm text-muted">
            Ninguém criou um perfil ainda. Seja o primeiro!
          </p>
        )}

        <button
          onClick={() => {
            setError("");
            setName("");
            setAvatarFile(null);
            setAvatarPreview(null);
            setMode("create");
          }}
          className="w-full rounded-md bg-accent py-2.5 font-medium text-white transition hover:bg-accentHover"
        >
          Criar novo perfil
        </button>
      </div>
    </main>
  );
}
