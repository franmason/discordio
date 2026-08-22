"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, Profile, setRememberMe as persistRememberMe } from "@/lib/supabase";
import { savePendingProfileName, markJustLoggedIn } from "@/lib/session";
import {
  AuthCard,
  Field,
  Notice,
  EmailInput,
  PasswordInput,
  TextInput,
  InlineLink,
  buttonClass,
} from "@/components/AuthUI";

type Mode = "loading" | "login" | "signup" | "forgot";

export default function EntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getSession demorou demais (timeout)")), 8000)
      );
      const {
        data: { session },
        error: sessionError,
      } = await Promise.race([supabase.auth.getSession(), timeout]);

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

  function switchMode(next: Mode) {
    setError("");
    setInfo("");
    setMode(next);
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

    // Precisa ser ANTES do login: é o que decide em qual storage
    // (localStorage ou sessionStorage) a sessão nova vai ser escrita.
    persistRememberMe(rememberMe);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (signInError) {
      console.error("Erro de login:", signInError.message);
      if (signInError.message.includes("Email not confirmed")) {
        setError("Confirma seu email antes de entrar (checa sua caixa de entrada).");
      } else {
        setError("Email ou senha incorretos.");
      }
      return;
    }

    markJustLoggedIn();
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
    persistRememberMe(true);

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
    // Guarda o nome escolhido pra usar quando ela entrar de verdade, pra
    // não perder e cair no nome aleatório de fallback.
    if (!signUpData.session) {
      savePendingProfileName(email.trim(), trimmedName);
      setSubmitting(false);
      setInfo("Conta criada! Confirma seu email e depois entra por aqui.");
      switchMode("login");
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
    markJustLoggedIn();
    router.push("/server");
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Coloca seu email primeiro.");
      return;
    }

    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setSubmitting(false);

    if (resetError) {
      console.error("Erro ao pedir redefinição de senha:", resetError.message);
      setError("Não deu pra enviar o email. Tenta de novo em instantes.");
      return;
    }

    // Não confirma se o email existe ou não — evita expor quais contas
    // estão cadastradas pra quem tentar adivinhar.
    setInfo("Se esse email tiver uma conta, chega um link pra redefinir a senha.");
  }

  if (mode === "loading") {
    return (
      <main className="flex h-full w-full items-center justify-center bg-black">
        <p className="text-sm text-neutral-500">Carregando...</p>
      </main>
    );
  }

  return (
    <AuthCard>
      {mode === "login" && (
        <form onSubmit={handleLogin}>
          <h1 className="mb-1 text-2xl font-bold text-white">
            Bem-vindo de volta
          </h1>
          <p className="mb-6 text-sm text-neutral-400">
            Entra na sua conta.
          </p>

          <Field label="Email">
            <EmailInput
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </Field>

          <Field label="Senha">
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="sua senha"
            />
          </Field>

          <div className="mb-1 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/40 accent-white"
              />
              Lembrar de mim
            </label>
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              Esqueci a senha
            </button>
          </div>

          {info && <Notice kind="info">{info}</Notice>}
          {error && <Notice kind="error">{error}</Notice>}

          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "Entrando..." : "Continuar"}
          </button>

          <p className="mt-4 text-center text-sm text-neutral-400">
            Não tem conta?{" "}
            <InlineLink onClick={() => switchMode("signup")}>
              Criar uma
            </InlineLink>
          </p>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={handleSignup}>
          <h1 className="mb-1 text-2xl font-bold text-white">Criar conta</h1>
          <p className="mb-6 text-sm text-neutral-400">
            Email, senha e nome. Foto é opcional.
          </p>

          <div className="mb-5 flex items-center gap-4">
            <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10 transition hover:ring-white/30">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Prévia da foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-neutral-500">Foto</span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <p className="text-xs text-neutral-500">
              Opcional. Clica no círculo pra escolher uma imagem.
            </p>
          </div>

          <Field label="Seu nome">
            <TextInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Chico"
            />
          </Field>

          <Field label="Email">
            <EmailInput
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </Field>

          <Field label="Senha">
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </Field>

          {error && <Notice kind="error">{error}</Notice>}

          <button
            type="submit"
            disabled={submitting}
            className={buttonClass}
          >
            {submitting ? "Criando..." : "Criar conta e entrar"}
          </button>

          <p className="mt-4 text-center text-sm text-neutral-400">
            Já tem conta?{" "}
            <InlineLink onClick={() => switchMode("login")}>
              Entrar
            </InlineLink>
          </p>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={handleForgotPassword}>
          <h1 className="mb-1 text-2xl font-bold text-white">
            Esqueceu a senha?
          </h1>
          <p className="mb-6 text-sm text-neutral-400">
            Coloca seu email — a gente manda um link pra você escolher uma
            senha nova.
          </p>

          <Field label="Email">
            <EmailInput
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </Field>

          {info && <Notice kind="info">{info}</Notice>}
          {error && <Notice kind="error">{error}</Notice>}

          <button
            type="submit"
            disabled={submitting}
            className={buttonClass}
          >
            {submitting ? "Enviando..." : "Enviar link de redefinição"}
          </button>

          <p className="mt-4 text-center text-sm text-neutral-400">
            <InlineLink onClick={() => switchMode("login")}>
              Voltar pro login
            </InlineLink>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
