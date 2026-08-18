import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  created_at: string;
};
