-- Tabela de aceites de termos legais
create table if not exists aceites_legais (
  id           uuid        primary key default gen_random_uuid(),
  usuario_id   uuid        not null references auth.users(id) on delete cascade,
  loja_id      uuid        references lojas(id) on delete set null,
  empresa_id   uuid        references empresas(id) on delete set null,
  tipo         text        not null check (tipo in ('termos_uso', 'politica_privacidade', 'contrato_lgpd')),
  versao       text        not null default '1.0',
  aceito_em    timestamptz not null default now(),
  ip_hash      text,
  user_agent_hash text,
  origem       text        not null default 'app',
  metadata     jsonb       not null default '{}'
);

create index if not exists aceites_legais_usuario_idx   on aceites_legais(usuario_id);
create index if not exists aceites_legais_usuario_tipo  on aceites_legais(usuario_id, tipo, versao);

alter table aceites_legais enable row level security;

-- Usuário lê seus próprios aceites
create policy "aceites_select_own" on aceites_legais
  for select
  using (usuario_id = auth.uid());

-- Usuário registra apenas o próprio aceite
create policy "aceites_insert_own" on aceites_legais
  for insert
  with check (usuario_id = auth.uid());

-- Sem update/delete por usuário — registro imutável
