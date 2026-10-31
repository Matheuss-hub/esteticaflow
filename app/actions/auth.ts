"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { getClinicaAtual } from "@/lib/clinica";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
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

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { error: "O cadastro está temporariamente indisponível. Configure a chave de serviço no servidor." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      data: { nome: parsed.data.nome },
      emailRedirectTo: `${baseUrl()}/auth/callback?next=/`,
    },
  });
  if (error || !data.user) {
    return { error: error?.message.includes("already registered") ? "Este e-mail já possui cadastro." : "Não foi possível criar sua conta. Confira o e-mail e tente novamente." };
  }

  const { error: clinicError } = await admin.rpc("criar_clinica_inicial", {
    p_user_id: data.user.id,
    p_nome: parsed.data.nome_clinica,
    p_email_dono: parsed.data.email,
    p_nome_dona: parsed.data.nome,
  });
  if (clinicError) {
    await admin.auth.admin.deleteUser(data.user.id);
    await supabase.auth.signOut();
    return { error: "Não foi possível criar a clínica. Nenhum cadastro foi mantido; tente novamente." };
  }

  return data.session
    ? { redirectTo: "/" }
    : { redirectTo: `/cadastro?confirmacao=${encodeURIComponent(parsed.data.email)}` };
}

export async function requestPasswordResetAction(formData: FormData): Promise<ActionResult> {
  const parsed = z.string().trim().email("Informe um e-mail válido.").safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Informe um e-mail válido." };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${baseUrl()}/auth/callback?next=/redefinir-senha`,
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

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  cookies().delete("esteticaflow_clinica_id");
  return { redirectTo: "/login" };
}

export async function getAuthContextAction() {
  try {
    return await getClinicaAtual();
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
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { redirectTo: "/login" };
  const { data: existing } = await supabase
    .from("clinica_membros")
    .select("clinica_id")
    .eq("user_id", user.id)
    .limit(1);
  if (existing?.length) return { redirectTo: "/" };

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { error: "Não foi possível criar a clínica agora. Tente novamente mais tarde." };
  }
  const name = typeof user.user_metadata?.nome === "string" ? user.user_metadata.nome : user.email;
  const { data: clinicId, error } = await admin.rpc("criar_clinica_inicial", {
    p_user_id: user.id,
    p_nome: parsed.data.nome_clinica,
    p_email_dono: user.email,
    p_nome_dona: name,
  });
  if (error || !clinicId) return { error: "Não foi possível criar a clínica. Confira os dados e tente novamente." };
  cookies().set("esteticaflow_clinica_id", clinicId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return { redirectTo: "/" };
}
