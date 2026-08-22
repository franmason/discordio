"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, setRememberMe } from "@/lib/supabase";
import { markJustLoggedIn } from "@/lib/session";
import {
  AuthCard,
  Field,
  Notice,
  PasswordInput,
  InlineLink,
  buttonClass,
} from "@/components/AuthUI";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // O link do email traz um token de recuperação na própria URL. O
  // cliente do Supabase processa isso sozinho ao carregar e vira uma
  // sessão temporária — a gente só confirma que ela existe (via evento ou
  // checando direto) antes de deixar redefinir a senha. Sem token válido
  // (link expirado, ou alguém só abriu essa página direto), mostra erro.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setStatus("ready");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) setStatus("ready");
    });

    const timer = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 4000);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setSubmitting(true);
    setRememberMe(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      console.error("Erro ao trocar senha:", updateError.message);
      setError("Não deu pra trocar a senha. Tenta gerar um novo link.");
      return;
    }

    setStatus("done");
    markJustLoggedIn();
    setTimeout(() => router.push("/server"), 1200);
  }

  if (status === "checking") {
    return (
      <main className="flex h-full w-full items-center justify-center bg-black">
        <p className="text-sm text-neutral-500">Verificando o link...</p>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <AuthCard>
        <h1 className="mb-1 text-2xl font-bold text-white">Link inválido</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Esse link de redefinição expirou ou já foi usado. Pede um novo na
          tela de login.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className={buttonClass}
        >
          Voltar pro login
        </button>
      </AuthCard>
    );
  }

  if (status === "done") {
    return (
      <AuthCard>
        <h1 className="mb-1 text-2xl font-bold text-white">
          Senha alterada!
        </h1>
        <p className="text-sm text-neutral-400">Te levando pra sala...</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit}>
        <h1 className="mb-1 text-2xl font-bold text-white">Nova senha</h1>
        <p className="mb-6 text-sm text-neutral-400">
          Escolhe uma senha nova pra sua conta.
        </p>

        <Field label="Nova senha">
          <PasswordInput
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
          />
        </Field>

        <Field label="Confirmar senha">
          <PasswordInput
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="repete a senha"
          />
        </Field>

        {error && <Notice kind="error">{error}</Notice>}

        <button type="submit" disabled={submitting} className={buttonClass}>
          {submitting ? "Salvando..." : "Salvar nova senha"}
        </button>

        <p className="mt-4 text-center text-sm text-neutral-400">
          <InlineLink onClick={() => router.push("/")}>Cancelar</InlineLink>
        </p>
      </form>
    </AuthCard>
  );
}
