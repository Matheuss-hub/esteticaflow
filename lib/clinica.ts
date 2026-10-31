import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClinicaResumo = {
  clinicaId: string;
  clinicaNome: string;
  role: string;
  nomeMembro: string;
};

export type ContextoClinica = ClinicaResumo & {
  userId: string;
  userNome: string;
  email: string;
  clinicas: ClinicaResumo[];
};

const CLINICA_COOKIE = "esteticaflow_clinica_id";

export async function getClinicaAtual(): Promise<ContextoClinica | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from("clinica_membros")
    .select("clinica_id, role, nome")
    .eq("user_id", user.id);

  if (membershipError) throw new Error("Não foi possível carregar suas clínicas.");
  if (!memberships?.length) return null;

  const clinicIds = memberships.map((membership) => membership.clinica_id);
  const { data: clinics, error: clinicError } = await supabase
    .from("clinicas")
    .select("id, nome")
    .in("id", clinicIds);

  if (clinicError) throw new Error("Não foi possível carregar suas clínicas.");

  const clinicById = new Map((clinics ?? []).map((clinic) => [clinic.id, clinic]));
  const availableClinics = memberships.flatMap((membership) => {
    const clinic = clinicById.get(membership.clinica_id);
    return clinic ? [{
      clinicaId: clinic.id,
      clinicaNome: clinic.nome,
      role: membership.role ?? "atendente",
      nomeMembro: membership.nome ?? "",
    }] : [];
  });
  if (!availableClinics.length) return null;

  const selectedId = cookies().get(CLINICA_COOKIE)?.value;
  const current = availableClinics.find((clinic) => clinic.clinicaId === selectedId) ?? availableClinics[0];
  const metadataName = user.user_metadata?.nome;
  const userNome = typeof metadataName === "string" && metadataName.trim()
    ? metadataName
    : current.nomeMembro || user.email || "Usuário";

  return {
    ...current,
    userId: user.id,
    userNome,
    email: user.email ?? "",
    clinicas: availableClinics,
  };
}
