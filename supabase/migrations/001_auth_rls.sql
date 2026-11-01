create or replace function public.criar_clinica_inicial(
  p_user_id uuid,
  p_nome text,
  p_email_dono text,
  p_nome_dona text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_clinica_id uuid;
begin
  if p_user_id is null or nullif(trim(p_nome), '') is null or nullif(trim(p_email_dono), '') is null then
    raise exception 'Dados obrigatórios para criar a clínica não informados.';
  end if;

  insert into public.clinicas (nome, email_dono, dona_user_id)
  values (trim(p_nome), lower(trim(p_email_dono)), p_user_id)
  returning id into v_clinica_id;

  insert into public.clinica_membros (clinica_id, user_id, role, nome)
  values (v_clinica_id, p_user_id, 'dona', nullif(trim(p_nome_dona), ''));

  return v_clinica_id;
end;
$$;

revoke all on function public.criar_clinica_inicial(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.criar_clinica_inicial(uuid, text, text, text) to service_role;

create or replace function public.usuario_membro_clinica(p_clinica_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.clinica_membros
    where clinica_id = p_clinica_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.usuario_dona_clinica(p_clinica_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.clinica_membros
    where clinica_id = p_clinica_id
      and user_id = auth.uid()
      and role = 'dona'
  );
$$;

revoke all on function public.usuario_membro_clinica(uuid) from public, anon;
revoke all on function public.usuario_dona_clinica(uuid) from public, anon;
grant execute on function public.usuario_membro_clinica(uuid) to authenticated, service_role;
grant execute on function public.usuario_dona_clinica(uuid) to authenticated, service_role;

drop policy if exists clinicas_select_membros on public.clinicas;
drop policy if exists clinicas_update_dona on public.clinicas;
drop policy if exists pacientes_membros_all on public.pacientes;
drop policy if exists servicos_membros_all on public.servicos;
drop policy if exists agendamentos_membros_all on public.agendamentos;
drop policy if exists pacotes_select_membros on public.pacotes;
drop policy if exists pacotes_insert_membros on public.pacotes;
drop policy if exists pacotes_update_membros on public.pacotes;
drop policy if exists pacotes_delete_dona on public.pacotes;
drop policy if exists clinica_membros_select_membros on public.clinica_membros;
drop policy if exists clinica_membros_insert_dona on public.clinica_membros;
drop policy if exists clinica_membros_update_dona on public.clinica_membros;
drop policy if exists clinica_membros_delete_dona on public.clinica_membros;

alter table public.clinicas enable row level security;
alter table public.pacientes enable row level security;
alter table public.servicos enable row level security;
alter table public.pacotes enable row level security;
alter table public.agendamentos enable row level security;
alter table public.clinica_membros enable row level security;

create policy clinicas_select_membros on public.clinicas
  for select to authenticated using (public.usuario_membro_clinica(id));
create policy clinicas_update_dona on public.clinicas
  for update to authenticated using (public.usuario_dona_clinica(id))
  with check (public.usuario_dona_clinica(id));

create policy pacientes_membros_all on public.pacientes
  for all to authenticated using (public.usuario_membro_clinica(clinica_id))
  with check (public.usuario_membro_clinica(clinica_id));
create policy servicos_membros_all on public.servicos
  for all to authenticated using (public.usuario_membro_clinica(clinica_id))
  with check (public.usuario_membro_clinica(clinica_id));
create policy agendamentos_membros_all on public.agendamentos
  for all to authenticated using (public.usuario_membro_clinica(clinica_id))
  with check (public.usuario_membro_clinica(clinica_id));

create policy pacotes_select_membros on public.pacotes
  for select to authenticated using (public.usuario_membro_clinica(clinica_id));
create policy pacotes_insert_membros on public.pacotes
  for insert to authenticated with check (public.usuario_membro_clinica(clinica_id));
create policy pacotes_update_membros on public.pacotes
  for update to authenticated using (public.usuario_membro_clinica(clinica_id))
  with check (public.usuario_membro_clinica(clinica_id));
create policy pacotes_delete_dona on public.pacotes
  for delete to authenticated using (public.usuario_dona_clinica(clinica_id));

create policy clinica_membros_select_membros on public.clinica_membros
  for select to authenticated using (
    user_id = auth.uid() or public.usuario_dona_clinica(clinica_id)
  );
create policy clinica_membros_insert_dona on public.clinica_membros
  for insert to authenticated with check (public.usuario_dona_clinica(clinica_id));
create policy clinica_membros_delete_dona on public.clinica_membros
  for delete to authenticated using (public.usuario_dona_clinica(clinica_id));
