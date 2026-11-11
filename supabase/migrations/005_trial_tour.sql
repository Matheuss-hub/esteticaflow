begin;

-- 1) Teste grátis de 7 dias. Os valores padrão valem para clínicas novas e também preenchem as existentes.
alter table public.clinicas
  add column if not exists status_assinatura text not null default 'trial',
  add column if not exists trial_inicio timestamptz not null default now(),
  add column if not exists trial_fim timestamptz not null default (now() + interval '7 days');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clinicas_status_assinatura_check'
      and conrelid = 'public.clinicas'::regclass
  ) then
    alter table public.clinicas
      add constraint clinicas_status_assinatura_check
      check (status_assinatura in ('trial', 'ativa', 'suspensa'));
  end if;
end;
$$;

-- 2) A clínica tem acesso para gravar se a assinatura está ativa ou se o teste ainda não acabou.
create or replace function public.clinica_com_acesso(p_clinica_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.clinicas c
    where c.id = p_clinica_id
      and (
        c.status_assinatura = 'ativa'
        or (c.status_assinatura = 'trial' and c.trial_fim > now())
      )
  );
$$;

revoke all on function public.clinica_com_acesso(uuid) from public, anon;
grant execute on function public.clinica_com_acesso(uuid) to authenticated, service_role;

-- 3) Quando o teste acaba, a clínica continua VENDO os dados, mas não grava mais.
--    Gatilho (trigger) vale até para as funções do banco. Manutenção pelo SQL Editor ou
--    pela chave de serviço (sem usuário logado) continua liberada.
create or replace function public.exigir_clinica_com_acesso()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_clinica uuid;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'DELETE' then
    v_clinica := (to_jsonb(old) ->> 'clinica_id')::uuid;
  else
    v_clinica := (to_jsonb(new) ->> 'clinica_id')::uuid;
  end if;

  if not public.clinica_com_acesso(v_clinica) then
    raise exception 'TESTE_ENCERRADO';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['pacientes', 'servicos', 'pacotes', 'agendamentos'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_exigir_acesso', t);
    execute format(
      'create trigger %I before insert or update or delete on public.%I
         for each row execute function public.exigir_clinica_com_acesso()',
      t || '_exigir_acesso', t
    );
  end loop;
end;
$$;

-- 4) Tutorial inicial e checklist: o estado é de cada pessoa
alter table public.clinica_membros
  add column if not exists tour_concluido boolean not null default false,
  add column if not exists checklist_oculto boolean not null default false;

create or replace function public.atualizar_meu_onboarding(
  p_clinica_id uuid,
  p_tour_concluido boolean,
  p_checklist_oculto boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.usuario_membro_clinica(p_clinica_id) then
    raise exception 'CLINICA_SEM_ACESSO';
  end if;

  update public.clinica_membros set
    tour_concluido = coalesce(p_tour_concluido, tour_concluido),
    checklist_oculto = coalesce(p_checklist_oculto, checklist_oculto)
  where clinica_id = p_clinica_id and user_id = auth.uid();
end;
$$;

revoke all on function public.atualizar_meu_onboarding(uuid, boolean, boolean) from public, anon;
grant execute on function public.atualizar_meu_onboarding(uuid, boolean, boolean) to authenticated;

commit;

notify pgrst, 'reload schema';
