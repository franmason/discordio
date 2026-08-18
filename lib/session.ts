import { Profile } from "@/lib/supabase";

const PROFILE_KEY = "dc_profile";

// Guarda só qual foi o último perfil escolhido nesse navegador, pra
// pular a tela de seleção da próxima vez. A fonte de verdade continua
// sendo a tabela `profiles` no Supabase, não o localStorage.
export function getSavedProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}
