-- Rode SÓ ISSO no SQL Editor do Supabase (não o schema.sql inteiro, que
-- apaga profiles/messages do zero). Esse aqui é aditivo e seguro: cria
-- uma coluna nova e dois canais novos, sem tocar em nada que já existe.

-- room_id liga um canal de TEXTO a uma sala de VOZ específica — é o que
-- faz "Bastidores" abrir o chat certo dependendo de em qual sala de voz
-- você está. NULL = chat geral, não amarrado a nenhuma sala.
alter table channels add column if not exists room_id uuid references channels(id) on delete cascade;

insert into channels (name, type, position, room_id)
select 'Chat da Sala 1', 'text', 4, id from channels where name = 'Sala de Voz 1'
on conflict (name) do nothing;

insert into channels (name, type, position, room_id)
select 'Chat da Sala 2', 'text', 5, id from channels where name = 'Sala de Voz 2'
on conflict (name) do nothing;
