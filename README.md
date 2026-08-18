# Sala (clone simples de Discord)

MVP: um servidor, canais fixos, chat que fica salvo, voz/vídeo/tela compartilhada,
e perfil próprio com foto pra cada amigo. Sem senha — quem já tem perfil escolhe
o seu numa lista; quem não tem, cria na hora com nome + foto.

## Stack
- **Next.js 15** (App Router) + Tailwind
- **Supabase** (Postgres + Realtime + Storage) → guarda mensagens, perfis e fotos
- **LiveKit Cloud** (WebRTC/SFU) → voz, webcam e tela compartilhada com baixo delay

## Passo a passo

### 1. Instalar dependências
```bash
npm install
```

### 2. Criar projeto no Supabase
1. Crie uma conta grátis em https://supabase.com e um novo projeto
2. Vá em **SQL Editor** e rode o conteúdo de `supabase/schema.sql`
   (cria as tabelas `profiles`, `channels` e `messages`, os 3 canais fixos,
   liga o Realtime e cria o bucket público `avatars` pras fotos de perfil)
3. Vá em **Project Settings > API** e copie a `URL` e a `anon public key`

### 3. Criar conta no LiveKit Cloud
1. Crie uma conta grátis em https://livekit.io (tem free tier)
2. Crie um projeto e copie: **API Key**, **API Secret** e a **WebSocket URL** (`wss://...`)

### 4. Configurar variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha o `.env.local` com os valores do Supabase e do LiveKit.

### 5. Rodar localmente
```bash
npm run dev
```
Abra http://localhost:3000. Na primeira vez, clique em "Criar novo perfil",
coloque um nome e (se quiser) uma foto. Nas próximas vezes, o navegador já
lembra o perfil e entra direto — dá pra trocar de perfil pelo botão "Trocar"
no canto da barra lateral.

## Deploy (Vercel)
Pra até uns 10 amigos, o plano grátis da Vercel + Supabase + LiveKit Cloud
aguenta numa boa:
1. Suba o código pra um repositório no GitHub
2. Crie conta em https://vercel.com, importe o repositório (ele detecta que é
   Next.js automaticamente)
3. Em **Environment Variables**, cole as mesmas variáveis do `.env.local`
4. Deploy — fica uma URL tipo `sua-sala.vercel.app` pra todo mundo acessar

## Como funciona
- **Perfil**: fica salvo na tabela `profiles` do Supabase (nome + foto), não
  só no navegador. O navegador guarda apenas o `id` do último perfil usado,
  pra entrar direto da próxima vez — a informação de verdade mora no banco,
  então o mesmo perfil funciona em qualquer aparelho, bastando escolher ele
  na lista.
- **Foto de perfil**: sobe pro bucket público `avatars` no Supabase Storage;
  só a URL pública fica salva na tabela `profiles`.
- **Chat de texto**: cada mensagem é gravada na tabela `messages` (com uma
  cópia do nome/foto de quem enviou, pra não mudar o histórico se a pessoa
  trocar de foto depois). Todo mundo no mesmo canal recebe a mensagem nova
  via Supabase Realtime, e o histórico fica salvo pra sempre.
- **Voz / webcam / tela**: cada canal de voz vira uma "room" do LiveKit. O
  navegador pega um token (gerado pela rota `/api/livekit-token`, que fica
  no servidor por segurança) e conecta direto no LiveKit, que cuida de toda
  a transmissão de áudio/vídeo com baixíssimo delay (WebRTC de verdade, não
  passa pelo banco de dados).

## Limitações conhecidas (por ser MVP)
- Sem senha: qualquer um que souber que existe um perfil "Chico" pode
  escolher ele na lista. Pra 10 amigos de confiança isso tende a ser
  aceitável, mas se quiser uma trava mínima, dá pra adicionar um PIN de 4
  dígitos na tabela `profiles` depois.
- A foto do perfil não aparece dentro da chamada de vídeo do LiveKit (o
  componente pronto deles mostra nome, não foto) — ela já vai como metadata
  do participante, então dá pra exibir com um overlay customizado depois se
  quiser.

## Próximos passos (fora do MVP)
- PIN ou senha simples por perfil
- Múltiplos servidores/canais criados pelos próprios usuários
- Indicador de quem está online / digitando
- Avatar customizado sobre o vídeo na chamada de voz
