begin;

-- 1) Novas colunas. Guardam o CAMINHO do arquivo no Storage, não a URL.
alter table public.clinicas
  add column if not exists telefone text,
  add column if not exists logo_path text;

alter table public.clinica_membros
  add column if not exists foto_path text;

-- 2) Bucket de imagens (logos e fotos de perfil). Limite de 2 MB, só imagens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Caminhos permitidos:
--   <clinica_id>/clinica/<arquivo>              -> só a dona da clínica
--   <clinica_id>/usuarios/<user_id>/<arquivo>   -> só o próprio usuário, membro da clínica
drop policy if exists avatares_insert on storage.objects;
drop policy if exists avatares_delete on storage.objects;

create policy avatares_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        case (storage.foldername(name))[2]
          when 'clinica' then
            public.usuario_dona_clinica(((storage.foldername(name))[1])::uuid)
          when 'usuarios' then
            (storage.foldername(name))[3] = auth.uid()::text
            and public.usuario_membro_clinica(((storage.foldername(name))[1])::uuid)
          else false
        end
      else false
    end
  );

create policy avatares_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatares'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        case (storage.foldername(name))[2]
          when 'clinica' then
            public.usuario_dona_clinica(((storage.foldername(name))[1])::uuid)
          when 'usuarios' then
            (storage.foldername(name))[3] = auth.uid()::text
            and public.usuario_membro_clinica(((storage.foldername(name))[1])::uuid)
          else false
        end
      else false
    end
  );

-- 3) Qualquer membro edita o PRÓPRIO nome e foto (e só isso)
create or replace function public.atualizar_meu_perfil(
  p_clinica_id uuid,
  p_nome text,
  p_foto_path text,
  p_alterar_foto boolean
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
  if nullif(trim(p_nome), '') is null or length(trim(p_nome)) > 80 then
    raise exception 'DADOS_INVALIDOS';
  end if;
  if p_alterar_foto and p_foto_path is not null and (
    p_foto_path !~ ('^' || p_clinica_id::text || '/usuarios/' || auth.uid()::text || '/[A-Za-z0-9._-]+$')
    or p_foto_path like '%..%'
  ) then
    raise exception 'ARQUIVO_INVALIDO';
  end if;

  update public.clinica_membros set
    nome = trim(p_nome),
    foto_path = case when p_alterar_foto then p_foto_path else foto_path end
  where clinica_id = p_clinica_id and user_id = auth.uid();
end;
$$;

revoke all on function public.atualizar_meu_perfil(uuid, text, text, boolean) from public, anon;
grant execute on function public.atualizar_meu_perfil(uuid, text, text, boolean) to authenticated;

-- 4) Só a dona edita nome, telefone e logo da clínica (plano, e-mail e dona NÃO são editáveis)
create or replace function public.atualizar_dados_clinica(
  p_clinica_id uuid,
  p_nome text,
  p_telefone text,
  p_logo_path text,
  p_alterar_logo boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_telefone text := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');
begin
  if auth.uid() is null or not public.usuario_dona_clinica(p_clinica_id) then
    raise exception 'CLINICA_SEM_ACESSO';
  end if;
  if nullif(trim(p_nome), '') is null or length(trim(p_nome)) > 120 then
    raise exception 'DADOS_INVALIDOS';
  end if;
  if v_telefone is not null and length(v_telefone) not between 10 and 11 then
    raise exception 'DADOS_INVALIDOS';
  end if;
  if p_alterar_logo and p_logo_path is not null and (
    p_logo_path !~ ('^' || p_clinica_id::text || '/clinica/[A-Za-z0-9._-]+$')
    or p_logo_path like '%..%'
  ) then
    raise exception 'ARQUIVO_INVALIDO';
  end if;

  update public.clinicas set
    nome = trim(p_nome),
    telefone = v_telefone,
    logo_path = case when p_alterar_logo then p_logo_path else logo_path end
  where id = p_clinica_id;
end;
$$;

revoke all on function public.atualizar_dados_clinica(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.atualizar_dados_clinica(uuid, text, text, text, boolean) to authenticated;

-- 5) A edição direta da tabela clinicas deixa de existir: tudo passa pela função acima.
--    Assim ninguém consegue alterar "plano", "email_dono" ou "dona_user_id" pela API.
drop policy if exists clinicas_update_dona on public.clinicas;

commit;

notify pgrst, 'reload schema';
