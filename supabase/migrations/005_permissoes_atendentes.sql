begin;

create or replace function public.limitar_membros_clinica()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.clinica_id::text, 0));
  if (
    select count(*)
    from public.clinica_membros
    where clinica_id = new.clinica_id
  ) >= 15 then
    raise exception 'LIMITE_FUNCIONARIOS_ATINGIDO';
  end if;
  return new;
end;
$$;

revoke all on function public.limitar_membros_clinica() from public, anon, authenticated;
drop trigger if exists clinica_membros_limite_insert on public.clinica_membros;
create trigger clinica_membros_limite_insert
  before insert on public.clinica_membros
  for each row execute function public.limitar_membros_clinica();

drop policy if exists pacientes_membros_all on public.pacientes;
drop policy if exists pacientes_select_membros on public.pacientes;
drop policy if exists pacientes_insert_membros on public.pacientes;
drop policy if exists pacientes_update_membros on public.pacientes;
drop policy if exists pacientes_delete_dona on public.pacientes;
create policy pacientes_select_membros on public.pacientes
  for select to authenticated using (public.usuario_membro_clinica(clinica_id));
create policy pacientes_insert_membros on public.pacientes
  for insert to authenticated with check (public.usuario_membro_clinica(clinica_id));
create policy pacientes_update_membros on public.pacientes
  for update to authenticated using (public.usuario_membro_clinica(clinica_id))
  with check (public.usuario_membro_clinica(clinica_id));
create policy pacientes_delete_dona on public.pacientes
  for delete to authenticated using (public.usuario_dona_clinica(clinica_id));

drop policy if exists agendamentos_membros_all on public.agendamentos;
drop policy if exists agendamentos_select_membros on public.agendamentos;
drop policy if exists agendamentos_insert_membros on public.agendamentos;
drop policy if exists agendamentos_update_membros on public.agendamentos;
drop policy if exists agendamentos_delete_dona on public.agendamentos;
create policy agendamentos_select_membros on public.agendamentos
  for select to authenticated using (public.usuario_membro_clinica(clinica_id));
create policy agendamentos_insert_membros on public.agendamentos
  for insert to authenticated with check (public.usuario_membro_clinica(clinica_id));
create policy agendamentos_update_membros on public.agendamentos
  for update to authenticated using (public.usuario_membro_clinica(clinica_id))
  with check (public.usuario_membro_clinica(clinica_id));
create policy agendamentos_delete_dona on public.agendamentos
  for delete to authenticated using (public.usuario_dona_clinica(clinica_id));

drop policy if exists servicos_membros_all on public.servicos;
drop policy if exists servicos_select_membros on public.servicos;
drop policy if exists servicos_insert_dona on public.servicos;
drop policy if exists servicos_update_dona on public.servicos;
drop policy if exists servicos_delete_dona on public.servicos;
create policy servicos_select_membros on public.servicos
  for select to authenticated using (public.usuario_membro_clinica(clinica_id));
create policy servicos_insert_dona on public.servicos
  for insert to authenticated with check (public.usuario_dona_clinica(clinica_id));
create policy servicos_update_dona on public.servicos
  for update to authenticated using (public.usuario_dona_clinica(clinica_id))
  with check (public.usuario_dona_clinica(clinica_id));
create policy servicos_delete_dona on public.servicos
  for delete to authenticated using (public.usuario_dona_clinica(clinica_id));

commit;

notify pgrst, 'reload schema';
