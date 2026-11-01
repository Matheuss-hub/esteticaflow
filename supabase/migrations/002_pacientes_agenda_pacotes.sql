alter table public.pacientes
  add column if not exists email text,
  add column if not exists data_nascimento date,
  add column if not exists cpf text,
  add column if not exists como_conheceu text,
  add column if not exists alergias text,
  add column if not exists gestante_lactante boolean not null default false,
  add column if not exists medicamentos_uso text,
  add column if not exists condicoes_saude text,
  add column if not exists observacoes text,
  add column if not exists consentimento_whatsapp boolean not null default false,
  add column if not exists consentimento_whatsapp_em timestamptz,
  add column if not exists ultima_visita date;

alter table public.servicos
  add column if not exists duracao_min integer not null default 60;

alter table public.pacotes
  add column if not exists nome text not null default 'Pacote',
  add column if not exists total_sessoes integer not null default 1,
  add column if not exists sessoes_usadas integer not null default 0,
  add column if not exists valor_total numeric(12, 2) not null default 0,
  add column if not exists forma_pagamento text,
  add column if not exists data_inicio date not null default current_date,
  add column if not exists validade date,
  add column if not exists observacoes text,
  add column if not exists status text not null default 'ativo',
  add column if not exists concluido_em timestamptz;

alter table public.agendamentos
  add column if not exists pacote_id uuid,
  add column if not exists profissional_id uuid,
  add column if not exists duracao_minutos integer not null default 60,
  add column if not exists observacoes text,
  add column if not exists status text not null default 'agendado';

do $$
declare
  v_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into v_type
  from pg_attribute a
  where a.attrelid = 'public.agendamentos'::regclass and a.attname = 'status' and not a.attisdropped;
  if v_type <> 'text' then
    alter table public.agendamentos alter column status type text using status::text;
  end if;

  select format_type(a.atttypid, a.atttypmod) into v_type
  from pg_attribute a
  where a.attrelid = 'public.pacotes'::regclass and a.attname = 'status' and not a.attisdropped;
  if v_type <> 'text' then
    alter table public.pacotes alter column status type text using status::text;
  end if;
end;
$$;

create index if not exists pacientes_clinica_whatsapp_idx
  on public.pacientes (clinica_id, whatsapp);
create index if not exists agendamentos_clinica_data_idx
  on public.agendamentos (clinica_id, data_hora);
create index if not exists agendamentos_profissional_data_idx
  on public.agendamentos (clinica_id, profissional_id, data_hora);
create index if not exists pacotes_clinica_paciente_idx
  on public.pacotes (clinica_id, paciente_id, status);

drop policy if exists agendamentos_membros_all on public.agendamentos;
create policy agendamentos_membros_all on public.agendamentos
  for all to authenticated
  using (public.usuario_membro_clinica(clinica_id))
  with check (public.usuario_membro_clinica(clinica_id));

drop policy if exists clinica_membros_select_membros on public.clinica_membros;
create policy clinica_membros_select_membros on public.clinica_membros
  for select to authenticated
  using (public.usuario_membro_clinica(clinica_id));

create or replace function public.salvar_paciente(
  p_clinica_id uuid,
  p_paciente_id uuid,
  p_nome text,
  p_whatsapp text,
  p_email text,
  p_data_nascimento date,
  p_cpf text,
  p_como_conheceu text,
  p_alergias text,
  p_gestante_lactante boolean,
  p_medicamentos_uso text,
  p_condicoes_saude text,
  p_observacoes text,
  p_consentimento_whatsapp boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_paciente_id uuid;
  v_consentimento_anterior boolean := false;
begin
  if auth.uid() is null or not public.usuario_membro_clinica(p_clinica_id) then
    raise exception 'CLINICA_SEM_ACESSO';
  end if;
  if nullif(trim(p_nome), '') is null or length(p_whatsapp) not between 10 and 11 then
    raise exception 'DADOS_INVALIDOS';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_clinica_id::text || ':' || p_whatsapp));
  if exists (
    select 1 from public.pacientes p
    where p.clinica_id = p_clinica_id
      and regexp_replace(p.whatsapp::text, '\D', '', 'g') = p_whatsapp
      and (p_paciente_id is null or p.id <> p_paciente_id)
  ) then
    raise exception 'PACIENTE_DUPLICADO';
  end if;

  if p_paciente_id is null then
    insert into public.pacientes (
      clinica_id, nome, whatsapp, email, data_nascimento, cpf, como_conheceu,
      alergias, gestante_lactante, medicamentos_uso, condicoes_saude, observacoes,
      consentimento_whatsapp, consentimento_whatsapp_em
    ) values (
      p_clinica_id, trim(p_nome), p_whatsapp, nullif(trim(p_email), ''), p_data_nascimento,
      nullif(trim(p_cpf), ''), nullif(trim(p_como_conheceu), ''), nullif(trim(p_alergias), ''),
      p_gestante_lactante, nullif(trim(p_medicamentos_uso), ''), nullif(trim(p_condicoes_saude), ''),
      nullif(trim(p_observacoes), ''), p_consentimento_whatsapp,
      case when p_consentimento_whatsapp then now() else null end
    ) returning id into v_paciente_id;
  else
    select consentimento_whatsapp into v_consentimento_anterior
    from public.pacientes
    where id = p_paciente_id and clinica_id = p_clinica_id
    for update;
    if not found then raise exception 'PACIENTE_NAO_ENCONTRADO'; end if;

    update public.pacientes set
      nome = trim(p_nome), whatsapp = p_whatsapp, email = nullif(trim(p_email), ''),
      data_nascimento = p_data_nascimento, cpf = nullif(trim(p_cpf), ''),
      como_conheceu = nullif(trim(p_como_conheceu), ''), alergias = nullif(trim(p_alergias), ''),
      gestante_lactante = p_gestante_lactante, medicamentos_uso = nullif(trim(p_medicamentos_uso), ''),
      condicoes_saude = nullif(trim(p_condicoes_saude), ''), observacoes = nullif(trim(p_observacoes), ''),
      consentimento_whatsapp = p_consentimento_whatsapp,
      consentimento_whatsapp_em = case
        when p_consentimento_whatsapp and not coalesce(v_consentimento_anterior, false) then now()
        when p_consentimento_whatsapp then consentimento_whatsapp_em
        else null
      end
    where id = p_paciente_id and clinica_id = p_clinica_id
    returning id into v_paciente_id;
  end if;
  return v_paciente_id;
end;
$$;

revoke all on function public.salvar_paciente(uuid, uuid, text, text, text, date, text, text, text, boolean, text, text, text, boolean) from public, anon;
grant execute on function public.salvar_paciente(uuid, uuid, text, text, text, date, text, text, text, boolean, text, text, text, boolean) to authenticated;

create or replace function public.salvar_agendamento(
  p_clinica_id uuid,
  p_agendamento_id uuid,
  p_paciente_id uuid,
  p_servico_id uuid,
  p_pacote_id uuid,
  p_profissional_id uuid,
  p_data_hora timestamp,
  p_duracao_minutos integer,
  p_observacoes text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_status text;
  v_package public.pacotes%rowtype;
begin
  if auth.uid() is null or not public.usuario_membro_clinica(p_clinica_id) then
    raise exception 'CLINICA_SEM_ACESSO';
  end if;
  if not exists (select 1 from public.pacientes where id = p_paciente_id and clinica_id = p_clinica_id)
     or not exists (select 1 from public.servicos where id = p_servico_id and clinica_id = p_clinica_id) then
    raise exception 'PACIENTE_OU_SERVICO_INVALIDO';
  end if;
  if p_profissional_id is not null and not exists (
    select 1 from public.clinica_membros
    where clinica_id = p_clinica_id and user_id = p_profissional_id
  ) then raise exception 'PROFISSIONAL_INVALIDO'; end if;
  if p_duracao_minutos < 5 or p_data_hora is null then raise exception 'DADOS_INVALIDOS'; end if;

  if p_profissional_id is not null then
    perform pg_advisory_xact_lock(hashtext(p_clinica_id::text || ':' || p_profissional_id::text));
  end if;

  if p_pacote_id is not null then
    select * into v_package from public.pacotes
    where id = p_pacote_id and clinica_id = p_clinica_id and paciente_id = p_paciente_id
      and servico_id = p_servico_id and status = 'ativo' and (validade is null or validade >= p_data_hora::date)
    for update;
    if not found or v_package.sessoes_usadas >= v_package.total_sessoes then
      raise exception 'PACOTE_SEM_SESSOES';
    end if;
  end if;

  if p_agendamento_id is not null then
    select status::text into v_status from public.agendamentos
    where id = p_agendamento_id and clinica_id = p_clinica_id
    for update;
    if not found then raise exception 'AGENDAMENTO_NAO_ENCONTRADO'; end if;
    if v_status = 'realizado' then raise exception 'EDICAO_DE_REALIZADO_NAO_PERMITIDA'; end if;
  end if;

  if p_profissional_id is not null and exists (
    select 1 from public.agendamentos a
    where a.clinica_id = p_clinica_id and a.profissional_id = p_profissional_id
      and a.status::text not in ('cancelado', 'faltou')
      and (p_agendamento_id is null or a.id <> p_agendamento_id)
      and a.data_hora < p_data_hora + make_interval(mins => p_duracao_minutos)
      and a.data_hora + make_interval(mins => coalesce(a.duracao_minutos, 60)) > p_data_hora
  ) then raise exception 'CONFLITO_DE_HORARIO'; end if;

  if p_agendamento_id is null then
    insert into public.agendamentos (
      clinica_id, paciente_id, servico_id, pacote_id, profissional_id, data_hora,
      duracao_minutos, observacoes, status
    ) values (
      p_clinica_id, p_paciente_id, p_servico_id, p_pacote_id, p_profissional_id,
      p_data_hora, p_duracao_minutos, nullif(trim(p_observacoes), ''), 'agendado'
    ) returning id into v_id;
  else
    update public.agendamentos set
      paciente_id = p_paciente_id, servico_id = p_servico_id, pacote_id = p_pacote_id,
      profissional_id = p_profissional_id, data_hora = p_data_hora,
      duracao_minutos = p_duracao_minutos, observacoes = nullif(trim(p_observacoes), '')
    where id = p_agendamento_id and clinica_id = p_clinica_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.salvar_agendamento(uuid, uuid, uuid, uuid, uuid, uuid, timestamp, integer, text) from public, anon;
grant execute on function public.salvar_agendamento(uuid, uuid, uuid, uuid, uuid, uuid, timestamp, integer, text) to authenticated;

create or replace function public.alterar_status_agendamento(
  p_clinica_id uuid,
  p_agendamento_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_agendamento public.agendamentos%rowtype;
  v_status_anterior text;
begin
  if auth.uid() is null or not public.usuario_membro_clinica(p_clinica_id) then
    raise exception 'CLINICA_SEM_ACESSO';
  end if;
  if p_status not in ('agendado', 'confirmado', 'faltou', 'cancelado', 'realizado') then
    raise exception 'STATUS_INVALIDO';
  end if;
  select * into v_agendamento from public.agendamentos
  where id = p_agendamento_id and clinica_id = p_clinica_id
  for update;
  if not found then raise exception 'AGENDAMENTO_NAO_ENCONTRADO'; end if;

  v_status_anterior := v_agendamento.status::text;
  if v_status_anterior = 'realizado' and p_status <> 'realizado' and v_agendamento.pacote_id is not null then
    update public.pacotes set
      sessoes_usadas = greatest(sessoes_usadas - 1, 0),
      status = case when status = 'concluido' and sessoes_usadas - 1 < total_sessoes then 'ativo' else status end,
      concluido_em = case when status = 'concluido' and sessoes_usadas - 1 < total_sessoes then null else concluido_em end
    where id = v_agendamento.pacote_id and clinica_id = p_clinica_id;
  elsif v_status_anterior <> 'realizado' and p_status = 'realizado' and v_agendamento.pacote_id is not null then
    update public.pacotes set
      sessoes_usadas = sessoes_usadas + 1,
      status = case when sessoes_usadas + 1 >= total_sessoes then 'concluido' else 'ativo' end,
      concluido_em = case when sessoes_usadas + 1 >= total_sessoes then now() else null end
    where id = v_agendamento.pacote_id and clinica_id = p_clinica_id
      and status = 'ativo' and sessoes_usadas < total_sessoes;
    if not found then raise exception 'PACOTE_SEM_SESSOES'; end if;
  end if;

  update public.agendamentos set status = p_status
  where id = p_agendamento_id and clinica_id = p_clinica_id;

  if v_agendamento.paciente_id is not null then
    update public.pacientes p set ultima_visita = (
      select max(a.data_hora::date) from public.agendamentos a
      where a.paciente_id = v_agendamento.paciente_id and a.clinica_id = p_clinica_id
        and a.status::text = 'realizado'
    ) where p.id = v_agendamento.paciente_id and p.clinica_id = p_clinica_id;
  end if;
end;
$$;

revoke all on function public.alterar_status_agendamento(uuid, uuid, text) from public, anon;
grant execute on function public.alterar_status_agendamento(uuid, uuid, text) to authenticated;