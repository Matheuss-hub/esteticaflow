"use server";

import { z } from "zod";
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
  } catch {
    return { error: "Não foi possível validar sua clínica. Tente novamente." };
  }
  if (!clinic) return { error: "Sua conta ainda não está vinculada a uma clínica." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("atualizar_meu_onboarding", {
    p_clinica_id: clinic.clinicaId,
    p_tour_concluido: parsed.data.tourConcluido,
    p_checklist_oculto: parsed.data.checklistOculto,
  });
  if (error) return { error: "Não foi possível salvar essa alteração. Tente novamente." };
  return { success: true };
}
