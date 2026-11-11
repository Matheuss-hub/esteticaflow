"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAcessoAtivo, exigirDona, type ContextoClinica } from "@/lib/clinica";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { gerarSenhaProvisoria } from "@/lib/supabase/password";

type ActionError = { error: string };
type ActionSuccess = { success: string };
type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
type TeamMemberData = {
  id: string;
  user_id: string;
  role: string | null;
  nome: string | null;
  created_at: string | null;
  foto_path: string | null;
  funcao: string | null;
  email: string;
  telefone: string;
  foto_url: string | null;
};
type TargetEmployeeResult =
  | { admin: AdminClient; member: { user_id: string; role: string; nome: string | null; funcao: string | null; foto_path: string | null } }
  | ActionError;

async function exigirDonaComAcesso(): Promise<{ clinic: ContextoClinica } | ActionError> {
  const access = await exigirAcessoAtivo();
  if ("error" in access) return { error: access.error };
  if (access.clinic.role !== "dona") {
    return { error: "Apenas a responsável pela clínica pode gerenciar esta área." };
  }
  return { clinic: access.clinic };
}

const phoneSchema = z.string().trim().transform((phone) => phone.replace(/\D/g, "")).refine(
  (phone) => phone.length === 0 || phone.length === 10 || phone.length === 11,
  "Informe um telefone com DDD e 10 ou 11 dígitos.",
);

async function adminClient(): Promise<{ admin: AdminClient } | ActionError> {
  try {
    return { admin: createSupabaseAdminClient() };
  } catch {
    return { error: "O gerenciamento da equipe está temporariamente indisponível." };
  }
}

async function rollbackCreatedUser(
  admin: AdminClient,
  clinicId: string,
  userId: string,
  membershipCreated: boolean,
): Promise<boolean> {
  let cleanupFailed = false;
  if (membershipCreated) {
    const { error } = await admin.from("clinica_membros")
      .delete()
      .eq("clinica_id", clinicId)
      .eq("user_id", userId);
    cleanupFailed ||= Boolean(error);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  cleanupFailed ||= Boolean(error);
  return !cleanupFailed;
}

function storageUrl(path: string | null): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const normalizedPath = path?.trim().replace(/^\/+/, "");
  return baseUrl && normalizedPath
    ? `${baseUrl}/storage/v1/object/public/avatares/${normalizedPath}`
    : null;
}

export async function gerarSenhaProvisoriaAction(): Promise<{ senhaProvisoria: string } | ActionError> {
  const authorization = await exigirDona();
  if ("error" in authorization) return { error: authorization.error };
  return { senhaProvisoria: gerarSenhaProvisoria() };
}

export async function loadTeamMembersAction(): Promise<{ members: TeamMemberData[]; currentUserId: string } | ActionError> {
  const authorization = await exigirDona();
  if ("error" in authorization) return { error: authorization.error };
  const client = await adminClient();
  if (!("admin" in client)) return client;
  const { admin } = client;

  const { clinic } = authorization;
  const [membersResult, contactsResult] = await Promise.all([
    admin.from("clinica_membros")
      .select("id, user_id, role, nome, created_at, foto_path, funcao")
      .eq("clinica_id", clinic.clinicaId)
      .order("created_at", { ascending: true }),
    admin.from("membros_contato")
      .select("user_id, email, telefone")
      .eq("clinica_id", clinic.clinicaId),
  ]);
  if (membersResult.error || contactsResult.error) {
    return { error: "Não foi possível carregar a equipe. Confirme se a migração da equipe já foi aplicada." };
  }

  const contacts = new Map((contactsResult.data ?? []).map((contact) => [contact.user_id, contact]));
  const enrichedMembers = await Promise.all((membersResult.data ?? []).map(async (member) => {
    const contact = contacts.get(member.user_id);
    let email = contact?.email ?? (member.user_id === clinic.userId ? clinic.email : "");
    if (!email && member.user_id !== clinic.userId) {
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(member.user_id);
      if (authUserError || !authUser.user?.email) return { error: true as const };
      email = authUser.user.email;
    }
    return {
      member: {
        ...member,
        email,
        telefone: contact?.telefone ?? "",
        foto_url: storageUrl(member.foto_path),
      },
    };
  }));
  const members: TeamMemberData[] = [];
  for (const item of enrichedMembers) {
    if ("error" in item) return { error: "Não foi possível carregar os dados de acesso da equipe." };
    members.push(item.member);
  }
  return { members, currentUserId: clinic.userId };
}

const createEmployeeSchema = z.object({
  nome: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(80, "O nome deve ter até 80 caracteres."),
  email: z.string().trim().email("Informe um e-mail válido.").transform((email) => email.toLowerCase()),
  telefone: phoneSchema,
  funcao: z.string().trim().max(60, "A função deve ter até 60 caracteres.").optional().transform((funcao) => funcao || null),
  senha: z.string().min(8, "A senha provisória deve ter pelo menos 8 caracteres."),
});

export async function cadastrarFuncionario(input: unknown): Promise<ActionError | { email: string; senhaProvisoria: string; telefone: string }> {
  const authorization = await exigirDonaComAcesso();
  if ("error" in authorization) return { error: authorization.error };
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const client = await adminClient();
  if (!("admin" in client)) return client;
  const { admin } = client;
  const { clinic } = authorization;

  const { count, error: countError } = await admin
    .from("clinica_membros")
    .select("user_id", { count: "exact", head: true })
    .eq("clinica_id", clinic.clinicaId);
  if (countError) return { error: "Não foi possível conferir o limite de funcionários. Tente novamente." };
  if ((count ?? 0) >= 15) return { error: "Limite de funcionários atingido." };

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.senha,
    email_confirm: true,
    user_metadata: { nome: parsed.data.nome },
    app_metadata: { precisa_trocar_senha: true },
  });
  if (error || !data.user) {
    return {
      error: error?.code === "email_exists"
        ? "Este e-mail já possui cadastro. Use outro e-mail."
        : "Não foi possível criar o acesso. Confira os dados e tente novamente.",
    };
  }

  const { error: membershipError } = await admin.from("clinica_membros").insert({
    clinica_id: clinic.clinicaId,
    user_id: data.user.id,
    role: "atendente",
    nome: parsed.data.nome,
    funcao: parsed.data.funcao,
  });
  if (membershipError) {
    const cleaned = await rollbackCreatedUser(admin, clinic.clinicaId, data.user.id, false);
    return {
      error: cleaned
        ? membershipError.message.includes("LIMITE_FUNCIONARIOS_ATINGIDO")
          ? "Limite de funcionários atingido."
          : "Não foi possível vincular o funcionário à clínica. Nenhum acesso foi mantido."
        : "Não foi possível concluir o cadastro e a limpeza automática falhou. Entre em contato com o suporte.",
    };
  }

  const { error: contactError } = await admin.from("membros_contato").insert({
    clinica_id: clinic.clinicaId,
    user_id: data.user.id,
    email: parsed.data.email,
    telefone: parsed.data.telefone || null,
  });
  if (contactError) {
    const cleaned = await rollbackCreatedUser(admin, clinic.clinicaId, data.user.id, true);
    return {
      error: cleaned
        ? "Não foi possível salvar os dados de contato. Nenhum acesso foi mantido."
        : "Não foi possível concluir o cadastro e a limpeza automática falhou. Entre em contato com o suporte.",
    };
  }

  revalidatePath("/equipe");
  revalidatePath("/");
  return {
    email: parsed.data.email,
    senhaProvisoria: parsed.data.senha,
    telefone: parsed.data.telefone,
  };
}

const updateEmployeeSchema = z.object({
  userId: z.string().uuid("Selecione um funcionário válido."),
  nome: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(80, "O nome deve ter até 80 caracteres."),
  telefone: phoneSchema,
  funcao: z.string().trim().max(60, "A função deve ter até 60 caracteres.").optional().transform((funcao) => funcao || null),
});

export async function atualizarFuncionario(input: unknown): Promise<ActionError | ActionSuccess> {
  const authorization = await exigirDonaComAcesso();
  if ("error" in authorization) return { error: authorization.error };
  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  if (parsed.data.userId === authorization.clinic.userId) {
    return { error: "Edite seus próprios dados em Meu perfil." };
  }
  const client = await adminClient();
  if (!("admin" in client)) return client;
  const { admin } = client;
  const { clinic } = authorization;
  const { data: member, error: memberError } = await admin.from("clinica_membros")
    .select("user_id, role")
    .eq("clinica_id", clinic.clinicaId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (memberError || !member || member.role !== "atendente") return { error: "Funcionário não encontrado nesta clínica." };

  const { error: memberUpdateError } = await admin.from("clinica_membros")
    .update({ nome: parsed.data.nome, funcao: parsed.data.funcao })
    .eq("clinica_id", clinic.clinicaId)
    .eq("user_id", parsed.data.userId);
  if (memberUpdateError) return { error: "Não foi possível atualizar os dados do funcionário." };

  const { data: existingContact, error: contactReadError } = await admin.from("membros_contato")
    .select("email")
    .eq("clinica_id", clinic.clinicaId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (contactReadError) {
    return { error: "O nome e a função foram atualizados, mas não foi possível salvar o telefone." };
  }
  if (existingContact) {
    const { data: updatedContact, error: contactUpdateError } = await admin.from("membros_contato")
      .update({ telefone: parsed.data.telefone || null })
      .eq("clinica_id", clinic.clinicaId)
      .eq("user_id", parsed.data.userId)
      .select("user_id")
      .maybeSingle();
    if (contactUpdateError || !updatedContact) {
      return { error: "O nome e a função foram atualizados, mas não foi possível salvar o telefone." };
    }
  } else {
    const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(parsed.data.userId);
    if (authUserError || !authUser.user?.email) {
      return { error: "O nome e a função foram atualizados, mas não foi possível salvar o telefone." };
    }
    const { error: contactInsertError } = await admin.from("membros_contato").upsert({
      clinica_id: clinic.clinicaId,
      user_id: parsed.data.userId,
      email: authUser.user.email,
      telefone: parsed.data.telefone || null,
    }, { onConflict: "clinica_id,user_id" });
    if (contactInsertError) {
      return { error: "O nome e a função foram atualizados, mas não foi possível salvar o telefone." };
    }
  }

  revalidatePath("/equipe");
  return { success: "Dados do funcionário atualizados." };
}

const memberIdSchema = z.object({ userId: z.string().uuid("Selecione um funcionário válido.") });

async function getTargetEmployee(userId: string, clinicId: string, currentUserId: string): Promise<TargetEmployeeResult> {
  if (userId === currentUserId) return { error: "Não é possível alterar o acesso da responsável pela clínica." };
  const client = await adminClient();
  if ("error" in client) return { error: client.error };
  const { data, error } = await client.admin.from("clinica_membros")
    .select("user_id, role, nome, funcao, foto_path")
    .eq("clinica_id", clinicId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data || data.role !== "atendente") return { error: "Funcionário não encontrado nesta clínica." };
  return { admin: client.admin, member: data };
}

export async function redefinirSenhaFuncionario(input: unknown): Promise<ActionError | { senhaProvisoria: string }> {
  const authorization = await exigirDonaComAcesso();
  if ("error" in authorization) return { error: authorization.error };
  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Selecione um funcionário válido." };
  const target = await getTargetEmployee(parsed.data.userId, authorization.clinic.clinicaId, authorization.clinic.userId);
  if ("error" in target) return target;
  const senhaProvisoria = gerarSenhaProvisoria();
  const { error } = await target.admin.auth.admin.updateUserById(parsed.data.userId, {
    password: senhaProvisoria,
    app_metadata: { precisa_trocar_senha: true },
  });
  if (error) return { error: "Não foi possível redefinir a senha. Tente novamente." };
  revalidatePath("/equipe");
  return { senhaProvisoria };
}

export async function removerFuncionario(input: unknown): Promise<ActionError | ActionSuccess> {
  const authorization = await exigirDonaComAcesso();
  if ("error" in authorization) return { error: authorization.error };
  const parsed = memberIdSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Selecione um funcionário válido." };
  const target = await getTargetEmployee(parsed.data.userId, authorization.clinic.clinicaId, authorization.clinic.userId);
  if ("error" in target) return target;
  const { admin, member } = target;
  const { clinic } = authorization;
  const { data: contact, error: contactReadError } = await admin.from("membros_contato")
    .select("email, telefone")
    .eq("clinica_id", clinic.clinicaId)
    .eq("user_id", member.user_id)
    .maybeSingle();
  if (contactReadError) return { error: "Não foi possível confirmar os dados do funcionário para removê-lo." };

  const { data: removedMember, error: removeMemberError } = await admin.from("clinica_membros")
    .delete()
    .eq("clinica_id", clinic.clinicaId)
    .eq("user_id", member.user_id)
    .select("user_id")
    .maybeSingle();
  if (removeMemberError || !removedMember) return { error: "Não foi possível remover o funcionário da clínica." };

  const { error: removeContactError } = await admin.from("membros_contato")
    .delete()
    .eq("clinica_id", clinic.clinicaId)
    .eq("user_id", member.user_id);
  if (removeContactError) {
    const { error: restoreMemberError } = await admin.from("clinica_membros").insert({
      clinica_id: clinic.clinicaId,
      user_id: member.user_id,
      role: "atendente",
      nome: member.nome,
      funcao: member.funcao,
      foto_path: member.foto_path,
    });
    let restoreContactFailed = false;
    if (!restoreMemberError && contact) {
      const { error } = await admin.from("membros_contato").insert({
        clinica_id: clinic.clinicaId,
        user_id: member.user_id,
        email: contact.email,
        telefone: contact.telefone,
      });
      restoreContactFailed = Boolean(error);
    }
    return {
      error: restoreMemberError || restoreContactFailed || !contact
        ? "A remoção ficou incompleta e não pôde ser revertida automaticamente. Entre em contato com o suporte."
        : "Não foi possível remover os dados de contato. A remoção foi desfeita.",
    };
  }

  const { count, error: membershipCountError } = await admin.from("clinica_membros")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", member.user_id);
  if (membershipCountError) {
    return { error: "O funcionário foi removido desta clínica, mas não foi possível conferir os outros vínculos para excluir o acesso." };
  }
  if ((count ?? 0) === 0) {
    const { error } = await admin.auth.admin.deleteUser(member.user_id);
    if (error) return { error: "O funcionário foi removido da clínica, mas não foi possível excluir o acesso. Entre em contato com o suporte." };
  }

  revalidatePath("/equipe");
  revalidatePath("/");
  revalidatePath("/", "layout");
  return { success: "Funcionário removido da equipe." };
}
