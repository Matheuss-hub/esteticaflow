"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAcessoAtivo, getClinicaAtual } from "@/lib/clinica";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SettingsResult = { error: string } | { success: string };

function rpcError(message: string): string {
  if (message.includes("CLINICA_SEM_ACESSO")) return "Você não tem permissão para esta ação.";
  if (message.includes("DADOS_INVALIDOS")) return "Confira os dados informados.";
  if (message.includes("ARQUIVO_INVALIDO")) return "Não foi possível usar esta imagem. Tente outra.";
  return "Não foi possível salvar as alterações. Tente novamente.";
}

async function currentClinic() {
  try {
    const clinic = await getClinicaAtual();
    return clinic ? { clinic } : { error: "Sua conta ainda não está vinculada a uma clínica." };
  } catch {
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
}

const profileSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome.").max(80, "O nome deve ter até 80 caracteres."),
  fotoPath: z.string().max(300).nullable(),
  alterarFoto: z.boolean(),
});

export async function updateMyProfileAction(input: unknown): Promise<SettingsResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const context = await currentClinic();
  if (!context.clinic) return { error: context.error };

  const { clinic } = context;
  const path = parsed.data.fotoPath;
  if (parsed.data.alterarFoto && path) {
    const expectedPrefix = `${clinic.clinicaId}/usuarios/${clinic.userId}/`;
    if (!path.startsWith(expectedPrefix) || path.includes("..") || !/^[A-Za-z0-9._-]+$/.test(path.slice(expectedPrefix.length))) {
      return { error: "Não foi possível usar esta imagem. Tente outra." };
    }
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("atualizar_meu_perfil", {
    p_clinica_id: clinic.clinicaId,
    p_nome: parsed.data.nome,
    p_foto_path: path,
    p_alterar_foto: parsed.data.alterarFoto,
  });
  if (error) return { error: rpcError(error.message) };

  revalidatePath("/", "layout");
  return { success: "Perfil atualizado." };
}

const clinicSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome da clínica.").max(120, "O nome deve ter até 120 caracteres."),
  telefone: z.string().transform((phone) => phone.replace(/\D/g, "")).refine(
    (phone) => phone.length === 0 || phone.length === 10 || phone.length === 11,
    "Informe um telefone com DDD e 10 ou 11 dígitos.",
  ),
  logoPath: z.string().max(300).nullable(),
  alterarLogo: z.boolean(),
});

export async function updateClinicSettingsAction(input: unknown): Promise<SettingsResult> {
  const authorization = await exigirAcessoAtivo();
  if ("error" in authorization) return { error: authorization.error };
  if (authorization.clinic.role !== "dona") return { error: "Apenas a responsável pela clínica pode gerenciar esta área." };
  const parsed = clinicSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const { clinic } = authorization;
  const path = parsed.data.logoPath;
  if (parsed.data.alterarLogo && path) {
    const expectedPrefix = `${clinic.clinicaId}/clinica/`;
    if (!path.startsWith(expectedPrefix) || path.includes("..") || !/^[A-Za-z0-9._-]+$/.test(path.slice(expectedPrefix.length))) {
      return { error: "Não foi possível usar esta imagem. Tente outra." };
    }
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("atualizar_dados_clinica", {
    p_clinica_id: clinic.clinicaId,
    p_nome: parsed.data.nome,
    p_telefone: parsed.data.telefone,
    p_logo_path: path,
    p_alterar_logo: parsed.data.alterarLogo,
  });
  if (error) return { error: rpcError(error.message) };

  revalidatePath("/", "layout");
  return { success: "Dados da clínica atualizados." };
}

const passwordSchema = z.object({
  senha: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres."),
  confirmarSenha: z.string(),
}).refine((values) => values.senha === values.confirmarSenha, {
  message: "As senhas não conferem.",
  path: ["confirmarSenha"],
});

export async function updateMyPasswordAction(input: unknown): Promise<SettingsResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Sua sessão expirou. Entre novamente para alterar a senha." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) return { error: "Não foi possível atualizar a senha. Tente novamente." };
  return { success: "Senha atualizada." };
}
