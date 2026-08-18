-- Rode isso no SQL Editor do seu projeto Supabase
-- ATENÇÃO: isso apaga a tabela antiga de "profiles" (sem senha) e recria
-- ligada ao Supabase Auth. Se já tinha gente cadastrada no modelo antigo,
-- ela vai precisar criar conta de novo com email/senha.

drop table if exists messages cascade;
drop table if exists profiles cascade;

-- Perfis: um por conta de autenticação (auth.users), com nome e foto
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('text', 'voice')),
  position int not null default 0
);

-- Mensagens guardam uma cópia do nome/avatar de quem enviou no momento do envio,
-- assim o histórico não muda se a pessoa trocar de foto ou nome depois.
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  author_name text not null,
  author_avatar_url text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_channel_created_idx
  on messages (channel_id, created_at);

-- Canais fixos do servidor (MVP: um servidor só)
insert into channels (name, type, position) values
  ('geral', 'text', 1),
  ('off-topic', 'text', 2),
  ('Sala de Voz 1', 'voice', 3)
on conflict (name) do nothing;

alter table profiles enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;

-- Qualquer logado pode ver todos os perfis (pra mostrar nome/foto no chat),
-- mas só pode criar/editar o próprio perfil (id = seu auth.uid()).
create policy "profiles_select_all" on profiles
  for select using (true);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "channels_select_all" on channels
  for select using (true);

create policy "messages_select_all" on messages
  for select using (true);

-- Só logado pode mandar mensagem, e só em nome do próprio perfil
create policy "messages_insert_own" on messages
  for insert with check (auth.uid() = author_id);

-- Habilita realtime na tabela de mensagens
alter publication supabase_realtime add table messages;

-- Bucket de storage pras fotos de perfil (público pra leitura)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_public_upload" on storage.objects;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Só logado pode subir foto
create policy "avatars_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
