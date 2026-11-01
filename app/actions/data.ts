"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClinicaAtual } from "@/lib/clinica";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionResult = { error?: string; success?: string };

async function getClinicOrError() {
  try {
    const clinic = await getClinicaAtual();
    return clinic ? { clinic } : { error: "Sua conta ainda não está vinculada a uma clínica." };
  } catch {
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
}

function databaseError() {
  return "Não foi possível concluir a operação. Confira os dados e tente novamente.";
}

export async function loadDashboardData() {
  const result = await getClinicOrError();
  if (!result.clinic) return { error: result.error };
  const supabase = createSupabaseServerClient();
  const clinicId = result.clinic.clinicaId;
  const [appointments, patients, services, packages] = await Promise.all([
    supabase.from("agendamentos").select("*").eq("clinica_id", clinicId),
    supabase.from("pacientes").select("id, nome, whatsapp, ultima_visita").eq("clinica_id", clinicId),
    supabase.from("servicos").select("*").eq("clinica_id", clinicId),
    supabase.from("pacotes").select("*").eq("clinica_id", clinicId),
  ]);
  const error = appointments.error || patients.error || services.error || packages.error;
  if (error) return { error: databaseError() };
  return {
    appointments: appointments.data ?? [],
    patients: patients.data ?? [],
    services: services.data ?? [],
    packages: packages.data ?? [],
  };
}

export async function loadAgendaData() {
  const result = await getClinicOrError();
  if (!result.clinic) return { error: result.error };
  const supabase = createSupabaseServerClient();
  const clinicId = result.clinic.clinicaId;
  const [appointments, patients, services, members] = await Promise.all([
    supabase.from("agendamentos").select("*").eq("clinica_id", clinicId),
    supabase.from("pacientes").select("id, nome, whatsapp").eq("clinica_id", clinicId),
    supabase.from("servicos").select("*").eq("clinica_id", clinicId),
    supabase.from("clinica_membros").select("user_id, nome, role").eq("clinica_id", clinicId),
  ]);
  const error = appointments.error || patients.error || services.error || members.error;
  if (error) return { error: databaseError() };
  return {
    appointments: appointments.data ?? [],
    patients: patients.data ?? [],
    services: services.data ?? [],
    members: members.data ?? [],
  };
}

export async function loadPatientsData() {
  const result = await getClinicOrError();
  if (!result.clinic) return { error: result.error };
  const supabase = createSupabaseServerClient();
  const clinicId = result.clinic.clinicaId;
  const [patients, appointments] = await Promise.all([
    supabase.from("pacientes").select("id, nome, whatsapp, ultima_visita").eq("clinica_id", clinicId),
    supabase.from("agendamentos").select("*").eq("clinica_id", clinicId),
  ]);
  const error = patients.error || appointments.error;
  if (error) return { error: databaseError() };
  return { patients: patients.data ?? [], appointments: appointments.data ?? [] };
}

const patientSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido."),
});

export async function createPatientAction(formData: FormData): Promise<ActionResult> {
  const parsed = patientSchema.safeParse({
    nome: formData.get("nome"),
    whatsapp: formData.get("whatsapp"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const result = await getClinicOrError();
  if (!result.clinic) return { error: result.error };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("pacientes").insert({
    clinica_id: result.clinic.clinicaId,
    nome: parsed.data.nome,
    whatsapp: parsed.data.whatsapp,
  });
  if (error) return { error: databaseError() };
  revalidatePath("/pacientes");
  return { success: "Paciente cadastrada com sucesso." };
}

export async function loadPackagesData() {
  const result = await getClinicOrError();
  if (!result.clinic) return { error: result.error };
  const supabase = createSupabaseServerClient();
  const clinicId = result.clinic.clinicaId;
  const [packages, patients, services] = await Promise.all([
    supabase.from("pacotes").select("*").eq("clinica_id", clinicId),
    supabase.from("pacientes").select("id, nome, whatsapp").eq("clinica_id", clinicId),
    supabase.from("servicos").select("*").eq("clinica_id", clinicId),
  ]);
  const error = packages.error || patients.error || services.error;
  if (error) return { error: databaseError() };
  return {
    packages: packages.data ?? [],
    patients: patients.data ?? [],
    services: services.data ?? [],
  };
}

const packageSchema = z.object({
  paciente_id: z.string().uuid("Selecione uma paciente válida."),
  servico_id: z.string().uuid("Selecione um serviço válido."),
  total_sessoes: z.coerce.number().int().min(1, "O total deve ser de pelo menos uma sessão."),
  sessoes_usadas: z.coerce.number().int().min(0, "As sessões utilizadas não podem ser negativas."),
}).refine((value) => value.sessoes_usadas <= value.total_sessoes, {
  message: "As sessões utilizadas não podem superar o total.",
  path: ["sessoes_usadas"],
});

export async function createPackageAction(formData: FormData): Promise<ActionResult> {
  const parsed = packageSchema.safeParse({
    paciente_id: formData.get("paciente_id"),
    servico_id: formData.get("servico_id"),
    total_sessoes: formData.get("total_sessoes"),
    sessoes_usadas: formData.get("sessoes_usadas"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const result = await getClinicOrError();
  if (!result.clinic) return { error: result.error };
  const supabase = createSupabaseServerClient();
  const clinicId = result.clinic.clinicaId;
  const [patient, service] = await Promise.all([
    supabase.from("pacientes").select("id").eq("clinica_id", clinicId).eq("id", parsed.data.paciente_id).maybeSingle(),
    supabase.from("servicos").select("id").eq("clinica_id", clinicId).eq("id", parsed.data.servico_id).maybeSingle(),
  ]);
  if (patient.error || service.error || !patient.data || !service.data) {
    return { error: "Selecione uma paciente e um serviço desta clínica." };
  }
  const { error } = await supabase.from("pacotes").insert({
    clinica_id: clinicId,
    paciente_id: parsed.data.paciente_id,
    servico_id: parsed.data.servico_id,
    total_sessoes: parsed.data.total_sessoes,
    sessoes_usadas: parsed.data.sessoes_usadas,
  });
  if (error) return { error: databaseError() };
  revalidatePath("/pacotes");
  revalidatePath("/");
  return { success: "Pacote criado com sucesso." };
}
