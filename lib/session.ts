import { supabase, Profile } from "@/lib/supabase";

// A fonte de verdade da sessão é o Supabase Auth (cookie/localStorage
// gerenciado pelo próprio supabase-js). Aqui só buscamos a linha
// correspondente em `profiles` pro usuário logado.
export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function signOut() {
  await supabase.auth.signOut();
}
