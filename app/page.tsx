"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Profile } from "@/lib/supabase";

type Mode = "loading" | "login" | "signup";

export default function EntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    console.log("[init] iniciando verificação de sessão...");
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getSession demorou demais (timeout)")), 8000)
      );
      const {
        data: { session },
        error: sessionError,
      } = await Promise.race([supabase.auth.getSession(), timeout]);
      console.log("[init] getSession retornou", { session, sessionError });

      if (sessionError) {
        console.error("Erro ao recuperar sessão:", sessionError.message);
        await supabase.auth.signOut();
        setMode("login");
        return;
      }

      if (session) {
        router.push("/server");
        return;
      }
    } catch (err) {
      console.error("Falha ao inicializar sessão:", err);
      await supabase.auth.signOut();
    }
    setMode("login");
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInError) {
      console.error("Erro de login:", signInError.message);
      setError("Email ou senha incorretos.");
      return;
    }

    router.push("/server");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Coloca um nome com pelo menos 2 letras");
      return;
    }
    if (trimmedName.length > 24) {
      setError("Nome muito longo (máx. 24 caracteres)");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres");
      return;
    }

    setSubmitting(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError || !signUpData.user) {
      setSubmitting(false);
      if (signUpError?.message.includes("already registered")) {
        setError("Já existe uma conta com esse email.");
      } else {
        setError("Não deu pra criar a conta. Tenta de novo.");
      }
      return;
    }

    // Se a confirmação de email estiver ativada no projeto Supabase, ainda
    // não temos sessão aqui — pede pra pessoa confirmar e depois logar.
    if (!signUpData.session) {
      setSubmitting(false);
      setInfo("Conta criada! Confirma seu email e depois entra por aqui.");
      setMode("login");
      return;
    }

    const userId = signUpData.user.id;

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, name: trimmedName })
      .select()
      .single();

    if (insertError || !newProfile) {
      setSubmitting(false);
      if (insertError?.code === "23505") {
        setError("Já existe alguém com esse nome. Escolhe outro.");
      } else {
        setError("Conta criada, mas não deu pra salvar o perfil.");
      }
      return;
    }

    let finalProfile = newProfile as Profile;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const path = `${userId}-${Date.now()}.${ext}`;

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
          .eq("id", userId)
          .select()
          .single();

        if (updated) finalProfile = updated as Profile;
      }
    }

    setSubmitting(false);
    void finalProfile;
    router.push("/server");
  }

  if (mode === "loading") {
    return (
      <main className="flex h-full w-full items-center justify-center bg-base">
        <p className="text-sm text-muted">Carregando...</p>
      </main>
    );
  }

  if (mode === "signup") {
    return (
      <main className="flex h-full w-full items-center justify-center bg-base">
        <form
          onSubmit={handleSignup}
          className="w-full max-w-sm rounded-lg bg-panel p-8 shadow-xl"
        >
          <h1 className="mb-1 text-xl font-semibold text-white">
            Criar conta
          </h1>
          <p className="mb-6 text-sm text-muted">
            Email, senha e nome. Foto é opcional.
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
            className="mb-4 w-full rounded-md border-none bg-base px-3 py-2.5 text-white outline-none ring-1 ring-transparent focus:ring-accent"
          />

          <label className="mb-2 block text-xs font-bold uppercase text-muted">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="mb-4 w-full rounded-md border-none bg-base px-3 py-2.5 text-white outline-none ring-1 ring-transparent focus:ring-accent"
          />

          <label className="mb-2 block text-xs font-bold uppercase text-muted">
            Senha
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            className="mb-1 w-full rounded-md border-none bg-base px-3 py-2.5 text-white outline-none ring-1 ring-transparent focus:ring-accent"
          />
          {error && <p className="mb-2 mt-2 text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-md bg-accent py-2.5 font-medium text-white transition hover:bg-accentHover disabled:opacity-60"
          >
            {submitting ? "Criando..." : "Criar conta e entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMode("login");
            }}
            className="mt-2 w-full rounded-md py-2 text-sm text-muted hover:text-white"
          >
            Já tenho conta
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex h-full w-full items-center justify-center bg-base">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-lg bg-panel p-8 shadow-xl"
      >
        <h1 className="mb-1 text-xl font-semibold text-white">Entrar</h1>
        <p className="mb-6 text-sm text-muted">
          Entra com seu email e senha.
        </p>

        <label className="mb-2 block text-xs font-bold uppercase text-muted">
          Email
        </label>
        <input
          autoFocus
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className="mb-4 w-full rounded-md border-none bg-base px-3 py-2.5 text-white outline-none ring-1 ring-transparent focus:ring-accent"
        />

        <label className="mb-2 block text-xs font-bold uppercase text-muted">
          Senha
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="sua senha"
          className="mb-1 w-full rounded-md border-none bg-base px-3 py-2.5 text-white outline-none ring-1 ring-transparent focus:ring-accent"
        />
        {info && <p className="mb-2 mt-2 text-xs text-green-400">{info}</p>}
        {error && <p className="mb-2 mt-2 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-accent py-2.5 font-medium text-white transition hover:bg-accentHover disabled:opacity-60"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError("");
            setInfo("");
            setMode("signup");
          }}
          className="mt-2 w-full rounded-md py-2 text-sm text-muted hover:text-white"
        >
          Criar conta nova
        </button>
      </form>
    </main>
  );
}
