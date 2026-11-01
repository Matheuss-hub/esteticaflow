"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClinicaAtual } from "@/lib/clinica";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionError = { error: string };
type ActionSuccess = { success: string; id?: string };

function rpcErrorMessage(message: string): string | undefined {
  if (message.includes("CLINICA_SEM_ACESSO")) return "Você não tem acesso a esta clínica.";
  if (message.includes("PACIENTE_DUPLICADO")) return "Já existe uma paciente com este WhatsApp nesta clínica.";
  if (message.includes("CONFLITO_DE_HORARIO")) return "Este profissional já tem outro atendimento nesse horário.";
  if (message.includes("PACOTE_SEM_SESSOES")) return "O pacote selecionado não tem sessões disponíveis ou está vencido.";
  if (message.includes("EDICAO_DE_REALIZADO_NAO_PERMITIDA")) return "Um atendimento realizado não pode ser editado.";
  return undefined;
}

async function clinicContext() {
  try {
    const clinic = await getClinicaAtual();
    return clinic ? { clinic } : { error: "Sua conta ainda não está vinculada a uma clínica." };
  } catch {
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
}

function value(formData: FormData, key: string): string {
  const field = formData.get(key);
  return typeof field === "string" ? field.trim() : "";
}

export async function loadPatientsPageData() {
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const [patients, appointments] = await Promise.all([
    supabase.from("pacientes").select("id, nome, whatsapp, ultima_visita").eq("clinica_id", context.clinic.clinicaId),
    supabase.from("agendamentos").select("id, paciente_id, data_hora, status").eq("clinica_id", context.clinic.clinicaId),
  ]);
  if (patients.error || appointments.error) return { error: "Não foi possível carregar os pacientes." };
  return { patients: patients.data ?? [], appointments: appointments.data ?? [] };
}

const patientSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nome: z.string().trim().min(2, "Informe o nome completo."),
  whatsapp: z.string().transform((phone) => phone.replace(/\D/g, "")).refine((phone) => phone.length === 10 || phone.length === 11, "Informe um WhatsApp com DDD."),
  email: z.union([z.literal(""), z.string().trim().email("Informe um e-mail válido.")]),
  data_nascimento: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")]),
  cpf: z.string().transform((cpf) => cpf.replace(/\D/g, "")).refine((cpf) => cpf.length === 0 || cpf.length === 11, "Informe um CPF com 11 dígitos."),
  como_conheceu: z.enum(["", "instagram", "indicacao", "google", "outro"]),
  alergias: z.string().max(4000),
  gestante_lactante: z.enum(["", "on", "true"]).optional(),
  medicamentos_uso: z.string().max(4000),
  condicoes_saude: z.string().max(4000),
  observacoes: z.string().max(8000),
  consentimento_whatsapp: z.enum(["", "on", "true"]).optional(),
});

export async function savePatientAction(formData: FormData): Promise<ActionError | (ActionSuccess & { id: string })> {
  const parsed = patientSchema.safeParse({
    id: value(formData, "id"), nome: value(formData, "nome"), whatsapp: value(formData, "whatsapp"),
    email: value(formData, "email"), data_nascimento: value(formData, "data_nascimento"),
    cpf: value(formData, "cpf"), como_conheceu: value(formData, "como_conheceu"),
    alergias: value(formData, "alergias"), gestante_lactante: formData.get("gestante_lactante") ?? "",
    medicamentos_uso: value(formData, "medicamentos_uso"), condicoes_saude: value(formData, "condicoes_saude"),
    observacoes: value(formData, "observacoes"), consentimento_whatsapp: formData.get("consentimento_whatsapp") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("salvar_paciente", {
    p_clinica_id: context.clinic.clinicaId,
    p_paciente_id: parsed.data.id || null,
    p_nome: parsed.data.nome,
    p_whatsapp: parsed.data.whatsapp,
    p_email: parsed.data.email,
    p_data_nascimento: parsed.data.data_nascimento || null,
    p_cpf: parsed.data.cpf,
    p_como_conheceu: parsed.data.como_conheceu,
    p_alergias: parsed.data.alergias,
    p_gestante_lactante: parsed.data.gestante_lactante === "on" || parsed.data.gestante_lactante === "true",
    p_medicamentos_uso: parsed.data.medicamentos_uso,
    p_condicoes_saude: parsed.data.condicoes_saude,
    p_observacoes: parsed.data.observacoes,
    p_consentimento_whatsapp: parsed.data.consentimento_whatsapp === "on" || parsed.data.consentimento_whatsapp === "true",
  });
  if (error || !data) {
    const message = error && rpcErrorMessage(error.message);
    if (message) return { error: message };
    return { error: "Não foi possível salvar a paciente. Confira os dados e tente novamente." };
  }
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${data}`);
  return { success: "Paciente salva com sucesso.", id: data };
}

export async function loadPatientDetailAction(patientId: string) {
  const id = z.string().uuid().safeParse(patientId);
  if (!id.success) return { error: "Paciente não encontrada." };
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const clinicId = context.clinic.clinicaId;
  const [patient, appointments, packages, services] = await Promise.all([
    supabase.from("pacientes").select("*").eq("clinica_id", clinicId).eq("id", id.data).maybeSingle(),
    supabase.from("agendamentos").select("*").eq("clinica_id", clinicId).eq("paciente_id", id.data).order("data_hora", { ascending: false }),
    supabase.from("pacotes").select("*").eq("clinica_id", clinicId).eq("paciente_id", id.data),
    supabase.from("servicos").select("id, nome").eq("clinica_id", clinicId),
  ]);
  if (patient.error || appointments.error || packages.error || services.error) return { error: "Não foi possível carregar o detalhe da paciente." };
  if (!patient.data) return { error: "Paciente não encontrada nesta clínica." };
  return { patient: patient.data, appointments: appointments.data ?? [], packages: packages.data ?? [], services: services.data ?? [] };
}

export async function loadAppointmentFormData(appointmentId?: string) {
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const clinicId = context.clinic.clinicaId;
  const [patients, services, packages, members, appointment] = await Promise.all([
    supabase.from("pacientes").select("id, nome, whatsapp").eq("clinica_id", clinicId).order("nome"),
    supabase.from("servicos").select("id, nome, duracao_min").eq("clinica_id", clinicId).order("nome"),
    supabase.from("pacotes").select("id, nome, paciente_id, servico_id, total_sessoes, sessoes_usadas, status, validade").eq("clinica_id", clinicId),
    supabase.from("clinica_membros").select("user_id, nome, role").eq("clinica_id", clinicId),
    appointmentId ? supabase.from("agendamentos").select("*").eq("clinica_id", clinicId).eq("id", appointmentId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (patients.error || services.error || packages.error || members.error || appointment.error) return { error: "Não foi possível carregar os dados do formulário." };
  return { patients: patients.data ?? [], services: services.data ?? [], packages: packages.data ?? [], members: members.data ?? [], appointment: appointment.data };
}

const appointmentSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  paciente_id: z.string().uuid("Selecione uma paciente válida."),
  servico_id: z.string().uuid("Selecione um serviço válido."),
  pacote_id: z.string().uuid().optional().or(z.literal("")),
  profissional_id: z.string().uuid().optional().or(z.literal("")),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Informe um horário válido."),
  duracao_minutos: z.coerce.number().int().min(5, "A duração mínima é de 5 minutos.").max(720, "A duração máxima é de 12 horas."),
  observacoes: z.string().max(4000),
});

export async function saveAppointmentAction(formData: FormData): Promise<ActionError | (ActionSuccess & { id: string })> {
  const parsed = appointmentSchema.safeParse({
    id: value(formData, "id"), paciente_id: value(formData, "paciente_id"), servico_id: value(formData, "servico_id"),
    pacote_id: value(formData, "pacote_id"), profissional_id: value(formData, "profissional_id"),
    data: value(formData, "data"), hora: value(formData, "hora"),
    duracao_minutos: value(formData, "duracao_minutos"), observacoes: value(formData, "observacoes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados do agendamento." };
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("salvar_agendamento", {
    p_clinica_id: context.clinic.clinicaId,
    p_agendamento_id: parsed.data.id || null,
    p_paciente_id: parsed.data.paciente_id,
    p_servico_id: parsed.data.servico_id,
    p_pacote_id: parsed.data.pacote_id || null,
    p_profissional_id: parsed.data.profissional_id || null,
    p_data_hora: `${parsed.data.data} ${parsed.data.hora}:00`,
    p_duracao_minutos: parsed.data.duracao_minutos,
    p_observacoes: parsed.data.observacoes,
  });
  if (error || !data) {
    const message = error && rpcErrorMessage(error.message);
    if (message) return { error: message };
    return { error: "Não foi possível salvar o agendamento. Confira os dados e tente novamente." };
  }
  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath(`/pacientes/${parsed.data.paciente_id}`);
  revalidatePath("/pacotes");
  return { success: "Agendamento salvo com sucesso.", id: data };
}

export async function changeAppointmentStatusAction(formData: FormData): Promise<ActionError | ActionSuccess> {
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["agendado", "confirmado", "faltou", "cancelado", "realizado"]) }).safeParse({
    id: value(formData, "id"), status: value(formData, "status"),
  });
  if (!parsed.success) return { error: "Selecione um status válido." };
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("alterar_status_agendamento", {
    p_clinica_id: context.clinic.clinicaId,
    p_agendamento_id: parsed.data.id,
    p_status: parsed.data.status,
  });
  if (error) {
    const message = rpcErrorMessage(error.message);
    if (message) return { error: message };
    return { error: "Não foi possível atualizar o status do agendamento." };
  }
  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath("/pacientes");
  revalidatePath("/pacotes");
  return { success: "Status atualizado com sucesso." };
}

export async function loadPackagesPageData() {
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const clinicId = context.clinic.clinicaId;
  const [packages, patients, services] = await Promise.all([
    supabase.from("pacotes").select("*").eq("clinica_id", clinicId),
    supabase.from("pacientes").select("id, nome, whatsapp").eq("clinica_id", clinicId),
    supabase.from("servicos").select("id, nome").eq("clinica_id", clinicId),
  ]);
  if (packages.error || patients.error || services.error) return { error: "Não foi possível carregar os pacotes." };
  return { packages: packages.data ?? [], patients: patients.data ?? [], services: services.data ?? [] };
}

const packageSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  paciente_id: z.string().uuid("Selecione uma paciente válida."),
  servico_id: z.string().uuid("Selecione um serviço válido."),
  nome: z.string().trim().min(2, "Informe o nome do pacote."),
  total_sessoes: z.coerce.number().int().min(1, "Informe ao menos uma sessão."),
  sessoes_usadas: z.coerce.number().int().min(0),
  valor_total: z.coerce.number().min(0, "O valor não pode ser negativo."),
  forma_pagamento: z.enum(["pix", "cartao", "dinheiro", "parcelado"]),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início."),
  validade: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma validade válida.")]),
  observacoes: z.string().max(4000),
}).refine((item) => item.sessoes_usadas <= item.total_sessoes, { message: "Sessões usadas não podem superar o total.", path: ["sessoes_usadas"] });

export async function savePackageAction(formData: FormData): Promise<ActionError | (ActionSuccess & { id: string })> {
  const parsed = packageSchema.safeParse({
    id: value(formData, "id"), paciente_id: value(formData, "paciente_id"), servico_id: value(formData, "servico_id"),
    nome: value(formData, "nome"), total_sessoes: value(formData, "total_sessoes"), sessoes_usadas: value(formData, "sessoes_usadas"),
    valor_total: value(formData, "valor_total").replace(",", "."), forma_pagamento: value(formData, "forma_pagamento"),
    data_inicio: value(formData, "data_inicio"), validade: value(formData, "validade"), observacoes: value(formData, "observacoes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados do pacote." };
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const clinicId = context.clinic.clinicaId;
  const [patient, service] = await Promise.all([
    supabase.from("pacientes").select("id").eq("clinica_id", clinicId).eq("id", parsed.data.paciente_id).maybeSingle(),
    supabase.from("servicos").select("id").eq("clinica_id", clinicId).eq("id", parsed.data.servico_id).maybeSingle(),
  ]);
  if (!patient.data || !service.data) return { error: "Selecione uma paciente e um serviço desta clínica." };
  const fields = {
    paciente_id: parsed.data.paciente_id, servico_id: parsed.data.servico_id, nome: parsed.data.nome,
    total_sessoes: parsed.data.total_sessoes, sessoes_usadas: parsed.data.sessoes_usadas,
    valor_total: parsed.data.valor_total, forma_pagamento: parsed.data.forma_pagamento,
    data_inicio: parsed.data.data_inicio, validade: parsed.data.validade || null,
    observacoes: parsed.data.observacoes || null,
    status: parsed.data.sessoes_usadas >= parsed.data.total_sessoes ? "concluido" : "ativo",
  };
  const query = parsed.data.id
    ? supabase.from("pacotes").update(fields).eq("clinica_id", clinicId).eq("id", parsed.data.id).select("id").maybeSingle()
    : supabase.from("pacotes").insert({ ...fields, clinica_id: clinicId }).select("id").single();
  const { data, error } = await query;
  if (error || !data) return { error: "Não foi possível salvar o pacote." };
  revalidatePath("/pacotes");
  revalidatePath(`/pacotes/${data.id}`);
  revalidatePath(`/pacientes/${parsed.data.paciente_id}`);
  revalidatePath("/");
  return { success: "Pacote salvo com sucesso.", id: data.id };
}

export async function loadPackageDetailAction(packageId: string) {
  const id = z.string().uuid().safeParse(packageId);
  if (!id.success) return { error: "Pacote não encontrado." };
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  const supabase = createSupabaseServerClient();
  const clinicId = context.clinic.clinicaId;
  const [pack, appointments, patient, service] = await Promise.all([
    supabase.from("pacotes").select("*").eq("clinica_id", clinicId).eq("id", id.data).maybeSingle(),
    supabase.from("agendamentos").select("*").eq("clinica_id", clinicId).eq("pacote_id", id.data).order("data_hora", { ascending: true }),
    supabase.from("pacientes").select("id, nome, whatsapp").eq("clinica_id", clinicId),
    supabase.from("servicos").select("id, nome").eq("clinica_id", clinicId),
  ]);
  if (pack.error || appointments.error || patient.error || service.error) return { error: "Não foi possível carregar o pacote." };
  if (!pack.data) return { error: "Pacote não encontrado nesta clínica." };
  return { pack: pack.data, appointments: appointments.data ?? [], patients: patient.data ?? [], services: service.data ?? [], role: context.clinic.role };
}

export async function cancelPackageAction(formData: FormData): Promise<ActionError | ActionSuccess> {
  const id = z.string().uuid().safeParse(value(formData, "id"));
  if (!id.success) return { error: "Pacote inválido." };
  const context = await clinicContext();
  if (!context.clinic) return { error: context.error };
  if (context.clinic.role !== "dona") return { error: "Somente a dona pode cancelar um pacote." };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("pacotes").update({ status: "cancelado" }).eq("clinica_id", context.clinic.clinicaId).eq("id", id.data);
  if (error) return { error: "Não foi possível cancelar o pacote." };
  revalidatePath("/pacotes");
  revalidatePath(`/pacotes/${id.data}`);
  return { success: "Pacote cancelado." };
}