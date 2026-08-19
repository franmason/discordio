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

  if (error) {
    console.error("Erro ao buscar perfil:", error.message);
    return null;
  }

  if (data) return data as Profile;

  // Sessão existe mas o perfil nunca foi criado (ex: cadastro que falhou
  // no passo de inserir em `profiles`). Cria um perfil básico agora pra
  // não deixar o usuário preso num loop de redirecionamento.
  const fallbackName =
    (session.user.email?.split("@")[0] || "usuario").slice(0, 24) +
    "-" +
    session.user.id.slice(0, 4);

  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({ id: session.user.id, name: fallbackName })
    .select()
    .single();

  if (createError || !created) {
    console.error("Erro ao criar perfil de fallback:", createError?.message);
    return null;
  }

  return created as Profile;
}

export async function signOut() {
  await supabase.auth.signOut();
}
