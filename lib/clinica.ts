import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClinicaResumo = {
  clinicaId: string;
  clinicaNome: string;
  role: string;
  nomeMembro: string;
  fotoUrl: string | null;
};

export type ContextoClinica = ClinicaResumo & {
  userId: string;
  userNome: string;
  fotoPath: string | null;
  clinicaTelefone: string;
  clinicaLogoPath: string | null;
  clinicaLogoUrl: string | null;
  emailResponsavel: string;
  email: string;
  clinicas: ClinicaResumo[];
  assinatura: {
    status: "trial" | "ativa" | "suspensa";
    trialInicio: string;
    trialFim: string;
    diasRestantes: number;
    temAcesso: boolean;
  };
  tourConcluido: boolean;
  checklistOculto: boolean;
};

export type ResultadoDona = { clinic: ContextoClinica } | { error: string };

const CLINICA_COOKIE = "esteticaflow_clinica_id";

function storageUrl(path: string | null | undefined): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const normalizedPath = path?.trim().replace(/^\/+/, "");
  if (!baseUrl || !normalizedPath) return null;
  return `${baseUrl}/storage/v1/object/public/avatares/${normalizedPath}`;
}

export async function getClinicaAtual(): Promise<ContextoClinica | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from("clinica_membros")
    .select("clinica_id, role, nome, foto_path, tour_concluido, checklist_oculto")
    .eq("user_id", user.id);

  if (membershipError) throw new Error("Não foi possível carregar suas clínicas.");
  if (!memberships?.length) return null;

  const clinicIds = memberships.map((membership) => membership.clinica_id);
  const { data: clinics, error: clinicError } = await supabase
    .from("clinicas")
    .select("id, nome, email_dono, telefone, logo_path, status_assinatura, trial_inicio, trial_fim")
    .in("id", clinicIds);

  if (clinicError) throw new Error("Não foi possível carregar suas clínicas.");

  const clinicById = new Map((clinics ?? []).map((clinic) => [clinic.id, clinic]));
  const availableClinics = memberships.flatMap((membership) => {
    const clinic = clinicById.get(membership.clinica_id);
    return clinic ? [{
      clinicaId: clinic.id,
      clinicaNome: clinic.nome,
      role: membership.role ?? "atendente",
      nomeMembro: membership.nome?.includes("@") ? "" : membership.nome ?? "",
      fotoUrl: storageUrl(membership.foto_path),
    }] : [];
  });
  if (!availableClinics.length) return null;

  const selectedId = cookies().get(CLINICA_COOKIE)?.value;
  const current = availableClinics.find((clinic) => clinic.clinicaId === selectedId) ?? availableClinics[0];
  const userNome = current.nomeMembro.trim();
  const clinic = clinicById.get(current.clinicaId)!;
  const status = clinic.status_assinatura as ContextoClinica["assinatura"]["status"];
  const trialFim = clinic.trial_fim as string;
  const trialInicio = clinic.trial_inicio as string;
  const trialFimTimestamp = new Date(trialFim).getTime();
  const temAcesso = status === "ativa" || (status === "trial" && trialFimTimestamp > Date.now());
  const diasRestantes = Number.isFinite(trialFimTimestamp)
    ? Math.max(0, Math.ceil((trialFimTimestamp - Date.now()) / 86_400_000))
    : 0;
  const currentMembership = memberships.find((membership) => membership.clinica_id === current.clinicaId);

  return {
    ...current,
    userId: user.id,
    userNome,
    fotoPath: currentMembership?.foto_path ?? null,
    clinicaTelefone: clinic.telefone ?? "",
    clinicaLogoPath: clinic.logo_path ?? null,
    clinicaLogoUrl: storageUrl(clinic.logo_path),
    emailResponsavel: clinic.email_dono ?? "",
    email: user.email ?? "",
    clinicas: availableClinics,
    assinatura: { status, trialInicio, trialFim, diasRestantes, temAcesso },
    tourConcluido: currentMembership?.tour_concluido ?? false,
    checklistOculto: currentMembership?.checklist_oculto ?? false,
  };
}

export async function exigirAcessoAtivo(): Promise<ResultadoDona> {
  let clinic: ContextoClinica | null;
  try {
    clinic = await getClinicaAtual();
  } catch {
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
  if (!clinic) return { error: "Sua conta ainda não está vinculada a uma clínica." };
  if (!clinic.assinatura.temAcesso) {
    return { error: "Seu teste grátis terminou. Fale com o suporte para ativar o plano." };
  }
  return { clinic };
}

export async function exigirDona(): Promise<ResultadoDona> {
  let clinic: ContextoClinica | null;
  try {
    clinic = await getClinicaAtual();
  } catch {
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
  if (!clinic) return { error: "Sua conta ainda não está vinculada a uma clínica." };
  if (clinic.role !== "dona") {
    return { error: "Apenas a responsável pela clínica pode gerenciar esta área." };
  }
  return { clinic };
}
