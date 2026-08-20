import { supabase, Profile } from "@/lib/supabase";

const PENDING_NAME_KEY = "pending_profile_names";

// Guarda o nome escolhido no cadastro pra quando o Supabase exige
// confirmação de email (não dá pra criar o perfil de cara, ainda não tem
// sessão). Assim que a pessoa confirmar e logar, usamos esse nome em vez
// de cair no fallback aleatório.
export function savePendingProfileName(email: string, name: string) {
  try {
    const raw = localStorage.getItem(PENDING_NAME_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[email.toLowerCase()] = name;
    localStorage.setItem(PENDING_NAME_KEY, JSON.stringify(map));
  } catch {
    // localStorage indisponível (modo privado etc.) — sem problema,
    // só cai no fallback normal depois.
  }
}

function takePendingProfileName(email: string | undefined): string | null {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(PENDING_NAME_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    const key = email.toLowerCase();
    const name = map[key];
    if (!name) return null;
    delete map[key];
    localStorage.setItem(PENDING_NAME_KEY, JSON.stringify(map));
    return name;
  } catch {
    return null;
  }
}

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

  // Sessão existe mas o perfil nunca foi criado — normalmente porque o
  // cadastro exigiu confirmação de email. Usa o nome escolhido no cadastro
  // se ainda tivermos ele guardado; só cai no nome aleatório se não achar.
  const pendingName = takePendingProfileName(session.user.email);
  const fallbackName =
    pendingName ||
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

const JUST_LOGGED_IN_KEY = "just_logged_in";

// Marca que a pessoa acabou de entrar (login/cadastro), pra tocar a
// animação de cortina só nesse momento — não num F5 na sala.
export function markJustLoggedIn() {
  try {
    sessionStorage.setItem(JUST_LOGGED_IN_KEY, "1");
  } catch {
    // sessionStorage indisponível — sem problema, só não toca a animação.
  }
}

// Consome a marca (lê e apaga), então só dispara uma vez por login.
export function consumeJustLoggedIn(): boolean {
  try {
    const value = sessionStorage.getItem(JUST_LOGGED_IN_KEY);
    if (value) sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
    return !!value;
  } catch {
    return false;
  }
}
