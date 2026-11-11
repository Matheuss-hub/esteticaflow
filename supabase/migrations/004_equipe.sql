begin;

-- Função (cargo) do membro. Visível aos colegas, serve para escolher o profissional na agenda.
alter table public.clinica_membros
  add column if not exists funcao text;

-- Um vínculo por pessoa em cada clínica
create unique index if not exists clinica_membros_clinica_user_uidx
  on public.clinica_membros (clinica_id, user_id);

-- Dados pessoais de contato: ficam em tabela separada e SÓ A DONA consegue ler.
-- A gravação é feita apenas pelo servidor (chave de serviço); ninguém escreve direto pela API.
create table if not exists public.membros_contato (
  clinica_id uuid not null,
  user_id uuid not null,
  email text not null,
  telefone text,
  created_at timestamptz not null default now(),
  primary key (clinica_id, user_id)
);

alter table public.membros_contato enable row level security;

drop policy if exists membros_contato_select_dona on public.membros_contato;
create policy membros_contato_select_dona on public.membros_contato
  for select to authenticated
  using (public.usuario_dona_clinica(clinica_id));

commit;

notify pgrst, 'reload schema';
