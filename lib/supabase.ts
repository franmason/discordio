import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Em dev, o Fast Refresh recarrega este módulo várias vezes. Sem isso,
// cada recarga cria um novo GoTrueClient que disputa o mesmo lock de auth
// no navegador (navigator.locks), travando getSession() pra sempre.
// Guardamos a instância no globalThis pra sobreviver ao HMR.
const globalForSupabase = globalThis as unknown as {
  supabase?: SupabaseClient;
};

export const supabase =
  globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseAnonKey);

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
