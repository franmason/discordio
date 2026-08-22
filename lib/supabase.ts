import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const REMEMBER_ME_KEY = "auth_remember_me";

// "Lembrar de mim" desmarcado guarda a sessão no sessionStorage (some
// quando a aba fecha) em vez do localStorage (sobrevive fechar o
// navegador). A preferência em si sempre mora no localStorage — é só um
// booleano, sem dado sensível, e precisa estar disponível ANTES do login
// pra decidir em qual storage a sessão nova vai ser escrita.
export function setRememberMe(remember: boolean) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? "true" : "false");
  } catch {
    // localStorage indisponível — sem problema, cai no padrão (lembrar).
  }
}

function shouldRemember(): boolean {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== "false";
  } catch {
    return true;
  }
}

// Adaptador de storage que decide, na hora de cada leitura/escrita, entre
// localStorage e sessionStorage — é isso que faz "lembrar de mim"
// funcionar de verdade (o supabase-js não tem esse conceito pronto).
const dynamicAuthStorage = {
  getItem: (key: string) => {
    try {
      return (shouldRemember() ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      const remember = shouldRemember();
      (remember ? localStorage : sessionStorage).setItem(key, value);
      // Limpa o outro storage pra não sobrar uma cópia parada de uma
      // escolha anterior, o que poderia confundir o próximo getItem.
      (remember ? sessionStorage : localStorage).removeItem(key);
    } catch {
      // sem problema, a sessão só não persiste
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // sem problema
    }
  },
};

// Em dev, o Fast Refresh recarrega este módulo várias vezes. Sem isso,
// cada recarga cria um novo GoTrueClient que disputa o mesmo lock de auth
// no navegador (navigator.locks), travando getSession() pra sempre.
// Guardamos a instância no globalThis pra sobreviver ao HMR.
const globalForSupabase = globalThis as unknown as {
  supabase?: SupabaseClient;
};

export const supabase =
  globalForSupabase.supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storage: dynamicAuthStorage },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabase = supabase;
}

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
};

export type Channel = {
  id: string;
  name: string;
  type: "text" | "voice";
  position: number;
  // Liga um canal de texto a uma sala de voz específica (o "Bastidores"
  // daquela sala). null = chat geral, não amarrado a nenhuma sala.
  room_id: string | null;
};

export type Message = {
  id: string;
  channel_id: string;
  author_id: string | null;
  author_name: string;
  author_avatar_url: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
  edited_at: string | null;
};
