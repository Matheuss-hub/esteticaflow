"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAcessoAtivo, getClinicaAtual } from "@/lib/clinica";
import { normalizarNomeServico, type Servico } from "@/lib/servicos";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionError = { error: string };
type ActionSuccess = { success: string };

const serviceSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nome: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(100, "O nome deve ter até 100 caracteres."),
  duracao_min: z.coerce.number().int().min(5, "A duração mínima é de 5 minutos.").max(720, "A duração máxima é de 12 horas."),
  preco: z.preprocess(
    (value) => value === "" || value === null || value === undefined
      ? null
      : Number(String(value).replace(",", ".")),
    z.number().finite("Informe um preço válido.").min(0, "O preço não pode ser negativo.").nullable(),
  ),
});

function toServico(row: { id: string; nome: string; duracao_min: number; preco: number | null }): Servico {
  return {
    id: row.id,
    nome: row.nome,
    duracao_min: row.duracao_min,
    preco: row.preco,
  };
}

function revalidateServiceSurfaces() {
  revalidatePath("/servicos");
  revalidatePath("/agenda/novo");
  revalidatePath("/pacotes");
  revalidatePath("/", "layout");
}

export async function loadServicesAction(): Promise<
  | { services: Servico[]; role: string; temAcesso: boolean }
  | ActionError
> {
  let clinic;
  try {
    clinic = await getClinicaAtual();
  } catch {
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
  if (!clinic) return { error: "Sua conta ainda não está vinculada a uma clínica." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("servicos")
    .select("id, nome, duracao_min, preco")
    .eq("clinica_id", clinic.clinicaId)
    .order("nome");
  if (error) return { error: "Não foi possível carregar os serviços. Tente novamente." };
  return { services: (data ?? []).map(toServico), role: clinic.role, temAcesso: clinic.assinatura.temAcesso };
}

export async function saveServiceAction(input: unknown): Promise<
  | { service: Servico; existing: boolean }
  | ActionSuccess
  | ActionError
> {
  const access = await exigirAcessoAtivo();
  if ("error" in access) return { error: access.error };
  if (access.clinic.role !== "dona") return { error: "Apenas a responsável pela clínica pode gerenciar esta área." };

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados do serviço." };

  const { clinic } = access;
  const supabase = createSupabaseServerClient();
  const { data: services, error: listError } = await supabase
    .from("servicos")
    .select("id, nome, duracao_min, preco")
    .eq("clinica_id", clinic.clinicaId);
  if (listError) return { error: "Não foi possível verificar os serviços desta clínica." };

  const duplicate = (services ?? []).find((service) =>
    normalizarNomeServico(service.nome) === normalizarNomeServico(parsed.data.nome)
    && service.id !== (parsed.data.id || ""),
  );
  if (duplicate) {
    if (parsed.data.id) return { error: "Já existe um serviço com esse nome nesta clínica." };
    return { service: toServico(duplicate), existing: true };
  }

  const values = {
    nome: parsed.data.nome,
    duracao_min: parsed.data.duracao_min,
    preco: parsed.data.preco,
  };
  const query = parsed.data.id
    ? supabase.from("servicos")
      .update(values)
      .eq("clinica_id", clinic.clinicaId)
      .eq("id", parsed.data.id)
      .select("id, nome, duracao_min, preco")
      .maybeSingle()
    : supabase.from("servicos")
      .insert({ ...values, clinica_id: clinic.clinicaId })
      .select("id, nome, duracao_min, preco")
      .single();
  const { data, error } = await query;
  if (error || !data) return { error: error?.message.includes("TESTE_ENCERRADO") ? "Seu teste grátis terminou. Fale com o suporte para ativar o plano." : "Não foi possível salvar o serviço. Confira os dados e tente novamente." };

  revalidateServiceSurfaces();
  if (parsed.data.id) return { success: "Serviço atualizado." };
  return { service: toServico(data), existing: false };
}

const serviceIdSchema = z.string().uuid("Selecione um serviço válido.");

export async function deleteServiceAction(input: unknown): Promise<ActionError | ActionSuccess> {
  const access = await exigirAcessoAtivo();
  if ("error" in access) return { error: access.error };
  if (access.clinic.role !== "dona") return { error: "Apenas a responsável pela clínica pode gerenciar esta área." };

  const parsed = serviceIdSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Selecione um serviço válido." };

  const { clinic } = access;
  const supabase = createSupabaseServerClient();
  const [appointments, packages] = await Promise.all([
    supabase.from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinic.clinicaId)
      .eq("servico_id", parsed.data),
    supabase.from("pacotes")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinic.clinicaId)
      .eq("servico_id", parsed.data),
  ]);
  if (appointments.error || packages.error) {
    return { error: "Não foi possível verificar se o serviço está em uso. Tente novamente." };
  }
  if ((appointments.count ?? 0) > 0 || (packages.count ?? 0) > 0) {
    return { error: "Este serviço não pode ser excluído porque está vinculado a agendamentos ou pacotes." };
  }

  const { data, error } = await supabase.from("servicos")
    .delete()
    .eq("clinica_id", clinic.clinicaId)
    .eq("id", parsed.data)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: error?.message.includes("TESTE_ENCERRADO") ? "Seu teste grátis terminou. Fale com o suporte para ativar o plano." : "Não foi possível excluir o serviço. Tente novamente." };

  revalidateServiceSurfaces();
  return { success: "Serviço excluído." };
}
