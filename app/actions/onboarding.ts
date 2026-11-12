"use server";

import { z } from "zod";
import { logActionFailure } from "@/lib/action-diagnostics";
import { getClinicaAtual } from "@/lib/clinica";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  tourConcluido: z.boolean().nullable(),
  checklistOculto: z.boolean().nullable(),
});

export async function atualizarMeuOnboarding(input: unknown): Promise<{ error?: string; success?: boolean }> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível atualizar suas preferências." };

  let clinic;
  try {
    clinic = await getClinicaAtual();
  } catch (error) {
    logActionFailure("onboarding", "obter_clinica_atual", error);
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
  if (!clinic) return { error: "Sua conta ainda não está vinculada a uma clínica." };

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (error) {
    logActionFailure("onboarding", "criar_cliente_servidor", error);
    throw error;
  }
  let error;
  try {
    ({ error } = await supabase.rpc("atualizar_meu_onboarding", {
      p_clinica_id: clinic.clinicaId,
      p_tour_concluido: parsed.data.tourConcluido,
      p_checklist_oculto: parsed.data.checklistOculto,
    }));
  } catch (error) {
    logActionFailure("onboarding", "atualizar_meu_onboarding", error);
    throw error;
  }
  if (error) {
    logActionFailure("onboarding", "atualizar_meu_onboarding", error);
    return { error: "Não foi possível salvar essa alteração. Tente novamente." };
  }
  return { success: true };
}
