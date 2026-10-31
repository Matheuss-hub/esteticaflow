"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClinicaAtual } from "@/lib/clinica";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TeamActionResult = { error?: string; success?: string };
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export async function loadTeamMembersAction() {
  try {
    const clinic = await getClinicaAtual();
    if (!clinic) return { error: "Sua conta ainda não está vinculada a uma clínica." };
    if (clinic.role !== "dona") return { error: "Somente a dona pode gerenciar a equipe." };
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("clinica_membros")
      .select("id, user_id, role, nome, created_at")
      .eq("clinica_id", clinic.clinicaId)
      .order("created_at", { ascending: true });
    if (error) return { error: "Não foi possível carregar a equipe." };
    return { members: data ?? [], currentUserId: clinic.userId };
  } catch {
    return { error: "Não foi possível carregar a equipe." };
  }
}

export async function inviteTeamMemberAction(formData: FormData): Promise<TeamActionResult> {
  const email = z.string().trim().email("Informe um e-mail válido.").safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0]?.message ?? "Informe um e-mail válido." };
  const clinic = await getClinicaAtual();
  if (!clinic) return { error: "Sua conta ainda não está vinculada a uma clínica." };
  if (clinic.role !== "dona") return { error: "Somente a dona pode convidar pessoas." };

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { error: "Convites indisponíveis. Configure a chave de serviço no servidor." };
  }
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.data, {
    redirectTo: `${siteUrl}/auth/callback?next=/`,
  });
  if (error || !data.user) {
    return { error: "Não foi possível enviar o convite. Verifique se o e-mail já possui uma conta." };
  }

  const { error: membershipError } = await admin.from("clinica_membros").insert({
    clinica_id: clinic.clinicaId,
    user_id: data.user.id,
    role: "atendente",
    nome: email.data,
  });
  if (membershipError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "O convite foi recebido, mas não foi possível vincular a pessoa à clínica." };
  }
  revalidatePath("/equipe");
  return { success: "Convite enviado com sucesso." };
}

export async function removeTeamMemberAction(formData: FormData): Promise<TeamActionResult> {
  const memberId = z.string().uuid("Selecione um membro válido.").safeParse(formData.get("membro_id"));
  if (!memberId.success) return { error: "Selecione um membro válido." };
  const clinic = await getClinicaAtual();
  if (!clinic) return { error: "Sua conta não está vinculada a uma clínica." };
  if (clinic.role !== "dona") return { error: "Somente a dona pode remover pessoas da equipe." };
  const supabase = createSupabaseServerClient();
  const { data: member, error: memberError } = await supabase
    .from("clinica_membros")
    .select("id, user_id, role")
    .eq("clinica_id", clinic.clinicaId)
    .eq("id", memberId.data)
    .maybeSingle();
  if (memberError || !member) return { error: "Membro não encontrado nesta clínica." };
  if (member.user_id === clinic.userId || member.role === "dona") {
    return { error: "Não é possível remover uma pessoa proprietária da clínica." };
  }
  const { error } = await supabase
    .from("clinica_membros")
    .delete()
    .eq("clinica_id", clinic.clinicaId)
    .eq("id", memberId.data);
  if (error) return { error: "Não foi possível remover este membro." };
  revalidatePath("/equipe");
  return { success: "Membro removido da equipe." };
}
