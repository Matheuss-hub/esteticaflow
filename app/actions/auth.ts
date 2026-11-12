"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActionFailure } from "@/lib/action-diagnostics";
import { getClinicaAtual } from "@/lib/clinica";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function baseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (process.env.NODE_ENV === "production" && (
      url.protocol !== "https:"
      || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    )) return null;
    return url.origin;
  } catch {
    return null;
  }
}
type ActionResult = { error?: string; success?: string; redirectTo?: string };

const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("senha") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: "E-mail ou senha inválidos." };
  const requestedPath = formData.get("next");
  const redirectTo = typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/";
  return { redirectTo };
}

const signupSchema = z.object({
  nome_clinica: z.string().trim().min(2, "Informe o nome da clínica."),
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
  confirmar_senha: z.string(),
}).refine((values) => values.senha === values.confirmar_senha, {
  message: "As senhas não conferem.",
  path: ["confirmar_senha"],
});

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    nome_clinica: formData.get("nome_clinica"),
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    confirmar_senha: formData.get("confirmar_senha"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const logSignupFailure = (step: string, error: unknown) => logActionFailure(
    "cadastro",
    step,
    error,
    [parsed.data.email, parsed.data.senha, parsed.data.confirmar_senha],
  );
  const siteUrl = baseUrl();
  if (!siteUrl) {
    logSignupFailure("validar_url_site", new Error("NEXT_PUBLIC_SITE_URL ausente ou inválida"));
    return { error: "O cadastro está temporariamente indisponível. Tente novamente mais tarde." };
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    logSignupFailure("criar_cliente_admin", error);
    return { error: "O cadastro está temporariamente indisponível. Configure a chave de serviço no servidor." };
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (error) {
    logSignupFailure("criar_cliente_servidor", error);
    throw error;
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.senha,
      options: {
        data: { nome: parsed.data.nome },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/`,
      },
    }));
  } catch (error) {
    logSignupFailure("criar_conta", error);
    throw error;
  }
  if (error || !data.user) {
    logSignupFailure("criar_conta", error ?? new Error("Supabase não retornou o usuário"));
    return { error: error?.message.includes("already registered") ? "Este e-mail já possui cadastro." : "Não foi possível criar sua conta. Confira o e-mail e tente novamente." };
  }

  let clinicError;
  try {
    ({ error: clinicError } = await admin.rpc("criar_clinica_inicial", {
      p_user_id: data.user.id,
      p_nome: parsed.data.nome_clinica,
      p_email_dono: parsed.data.email,
      p_nome_dona: parsed.data.nome,
    }));
  } catch (error) {
    logSignupFailure("criar_clinica_inicial", error);
    throw error;
  }
  if (clinicError) {
    logSignupFailure("criar_clinica_inicial", clinicError);
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    if (deleteError) logSignupFailure("remover_usuario_apos_falha", deleteError);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) logSignupFailure("encerrar_sessao_apos_falha", signOutError);
    return { error: "Não foi possível criar a clínica. Nenhum cadastro foi mantido; tente novamente." };
  }

  return data.session
    ? { redirectTo: "/" }
    : { redirectTo: `/cadastro?confirmacao=${encodeURIComponent(parsed.data.email)}` };
}

export async function resendSignupConfirmationAction(input: unknown): Promise<ActionResult> {
  const parsed = z.string().trim().email("Informe um e-mail válido.").safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Informe um e-mail válido." };
  const siteUrl = baseUrl();
  if (!siteUrl) return { error: "Não foi possível solicitar um novo link agora. Tente novamente mais tarde." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm` },
  });
  if (error) return { error: "Não foi possível reenviar o link agora. Confira o endereço e tente novamente." };
  return { success: "Se a conta ainda precisar de confirmação, enviaremos um novo link para o e-mail informado." };
}

export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const parsed = z.string().trim().email("Informe um e-mail válido.").safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Informe um e-mail válido." };
  const siteUrl = baseUrl();
  if (!siteUrl) return { error: "A redefinição de senha está temporariamente indisponível. Tente novamente mais tarde." };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
  });
  if (error) return { error: "Não foi possível enviar o e-mail agora. Tente novamente." };
  return { success: "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha." };
}

export async function updatePasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = z.object({
    senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
    confirmar_senha: z.string(),
  }).refine((values) => values.senha === values.confirmar_senha, {
    message: "As senhas não conferem.",
    path: ["confirmar_senha"],
  }).safeParse({ senha: formData.get("senha"), confirmar_senha: formData.get("confirmar_senha") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "O link expirou. Solicite uma nova redefinição de senha." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) return { error: "Não foi possível atualizar a senha. Solicite um novo link." };
  return { redirectTo: "/" };
}

export async function updateRequiredPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = z.object({
    senha: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres."),
    confirmar_senha: z.string(),
  }).refine((values) => values.senha === values.confirmar_senha, {
    message: "As senhas não conferem.",
    path: ["confirmar_senha"],
  }).safeParse({ senha: formData.get("senha"), confirmar_senha: formData.get("confirmar_senha") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { redirectTo: "/login" };
  if (user.app_metadata?.precisa_trocar_senha !== true) return { redirectTo: "/" };

  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (passwordError) return { error: "Não foi possível atualizar a senha. Tente novamente." };

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { error: "A senha foi atualizada, mas não foi possível concluir a configuração. Tente novamente mais tarde." };
  }
  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { precisa_trocar_senha: false },
  });
  if (metadataError) {
    return { error: "A senha foi atualizada, mas não foi possível concluir a configuração. Tente novamente." };
  }

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) return { error: "Senha atualizada. Entre novamente para continuar." };
  return { redirectTo: "/" };
}

export async function logoutFromMenuAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  cookies().delete("esteticaflow_clinica_id");
  redirect("/login");
}

export async function getAuthContextAction() {
  try {
    const context = await getClinicaAtual();
    if (!context) return null;
    return {
      userNome: context.userNome,
      fotoUrl: context.fotoUrl,
      role: context.role,
      clinicaNome: context.clinicaNome,
      clinicaId: context.clinicaId,
      clinicaLogoUrl: context.clinicaLogoUrl,
      assinatura: context.assinatura,
      tourConcluido: context.tourConcluido,
      checklistOculto: context.checklistOculto,
      trialInicio: context.assinatura.trialInicio,
      trialFim: context.assinatura.trialFim,
      clinicas: context.clinicas.map(({ clinicaId, clinicaNome }) => ({ clinicaId, clinicaNome })),
    };
  } catch {
    return null;
  }
}

export async function switchClinicAction(formData: FormData): Promise<ActionResult> {
  const clinicId = z.string().uuid("Selecione uma clínica válida.").safeParse(formData.get("clinica_id"));
  if (!clinicId.success) return { error: "Selecione uma clínica válida." };
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirectTo: "/login" };
  const { data: membership, error } = await supabase
    .from("clinica_membros")
    .select("clinica_id")
    .eq("user_id", user.id)
    .eq("clinica_id", clinicId.data)
    .maybeSingle();
  if (error || !membership) return { error: "Você não tem acesso a essa clínica." };
  cookies().set("esteticaflow_clinica_id", membership.clinica_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return { redirectTo: "/" };
}

const onboardingSchema = z.object({ nome_clinica: z.string().trim().min(2, "Informe o nome da clínica.") });

export async function createOnboardingClinicAction(formData: FormData): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse({ nome_clinica: formData.get("nome_clinica") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Informe o nome da clínica." };
  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (error) {
    logActionFailure("onboarding", "criar_cliente_servidor", error);
    throw error;
  }
  let user;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch (error) {
    logActionFailure("onboarding", "obter_usuario_atual", error);
    throw error;
  }
  if (!user?.email) return { redirectTo: "/login" };
  let existing;
  let membershipError;
  try {
    ({ data: existing, error: membershipError } = await supabase
      .from("clinica_membros")
      .select("clinica_id")
      .eq("user_id", user.id)
      .limit(1));
  } catch (error) {
    logActionFailure("onboarding", "verificar_vinculo_clinica", error);
    throw error;
  }
  if (membershipError) logActionFailure("onboarding", "verificar_vinculo_clinica", membershipError);
  if (existing?.length) return { redirectTo: "/" };

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    logActionFailure("onboarding", "criar_cliente_admin", error);
    return { error: "Não foi possível criar a clínica agora. Tente novamente mais tarde." };
  }
  const name = typeof user.user_metadata?.nome === "string" ? user.user_metadata.nome : "Responsável";
  let clinicId;
  let error;
  try {
    ({ data: clinicId, error } = await admin.rpc("criar_clinica_inicial", {
      p_user_id: user.id,
      p_nome: parsed.data.nome_clinica,
      p_email_dono: user.email,
      p_nome_dona: name,
    }));
  } catch (error) {
    logActionFailure("onboarding", "criar_clinica_inicial", error);
    throw error;
  }
  if (error || !clinicId) {
    logActionFailure("onboarding", "criar_clinica_inicial", error ?? new Error("RPC não retornou o identificador da clínica"));
    return { error: "Não foi possível criar a clínica. Confira os dados e tente novamente." };
  }
  cookies().set("esteticaflow_clinica_id", clinicId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return { redirectTo: "/" };
}
