"use client";

import { useEffect, useState } from "react";
import { supabase, Profile } from "@/lib/supabase";
import { Avatar } from "@/components/Sidebar";

export default function MemberList({
  onlineIds,
  onClose,
}: {
  onlineIds: Set<string>;
  onClose: () => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    let active = true;

    async function loadProfiles() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true });
      if (active && data) setProfiles(data as Profile[]);
    }
    loadProfiles();

    const sub = supabase
      .channel("profiles:member-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => loadProfiles()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(sub);
    };
  }, []);

  const online = profiles.filter((p) => onlineIds.has(p.id));
  const offline = profiles.filter((p) => !onlineIds.has(p.id));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xs flex-col bg-panel shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-4 md:h-16">
          <p className="font-display text-lg uppercase tracking-wider text-white">
            Membros
          </p>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="rounded-md p-2 text-muted transition hover:bg-white/5 hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {profiles.length === 0 ? (
            <p className="px-2 text-sm text-muted">Carregando...</p>
          ) : (
            <>
              <MemberGroup label="Online" members={online} online />
              <MemberGroup label="Offline" members={offline} online={false} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberGroup({
  label,
  members,
  online,
}: {
  label: string;
  members: Profile[];
  online: boolean;
}) {
  if (members.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/70">
        {label} — {members.length}
      </p>
      <div className="flex flex-col gap-0.5">
        {members.map((m) => (
          <div
            key={m.id}
            className={`flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/5 ${
              online ? "" : "opacity-45"
            }`}
          >
            <div className="relative shrink-0">
              <Avatar profile={m} size={34} />
              {online && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel bg-online" />
              )}
            </div>
            <span className="truncate text-sm font-medium text-white">
              {m.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
