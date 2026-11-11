"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, EyeOff } from "lucide-react";
import { atualizarMeuOnboarding } from "@/app/actions/onboarding";

type ChecklistProps = {
  role: string;
  hidden: boolean;
  profileComplete: boolean;
  serviceCount: number;
  patientCount: number;
  packageCount: number;
  appointmentCount: number;
  memberCount: number;
  temAcesso: boolean;
};

export function FirstStepsChecklist(props: ChecklistProps) {
  const [hidden, setHidden] = useState(props.hidden);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const owner = props.role === "dona";
  const items = [
    ...(owner ? [{ label: "Cadastrar um serviço", href: "/servicos", done: props.serviceCount > 0, optional: false }] : []),
    { label: "Cadastrar um paciente", href: "/pacientes/novo", done: props.patientCount > 0, optional: false },
    { label: "Criar um pacote", href: "/pacotes/novo", done: props.packageCount > 0, optional: false },
    { label: "Fazer um agendamento", href: "/agenda/novo", done: props.appointmentCount > 0, optional: false },
    ...(owner ? [{ label: "Cadastrar uma funcionária", href: "/equipe", done: props.memberCount > 1, optional: true }] : []),
    { label: "Completar o seu perfil", href: "/perfil", done: props.profileComplete, optional: false },
  ];
  const required = items.filter((item) => !item.optional);
  const completeRequired = required.filter((item) => item.done).length;
  const allRequiredDone = completeRequired === required.length;

  async function hideChecklist() {
    setSaving(true);
    setError("");
    try {
      const result = await atualizarMeuOnboarding({ tourConcluido: null, checklistOculto: true });
      if (result.error) setError(result.error);
      else setHidden(true);
    } catch {
      setError("Não foi possível ocultar o checklist. Tente novamente.");
    }
    setSaving(false);
  }

  if (hidden || allRequiredDone) return null;

  return (
    <section className="mb-6 rounded-2xl border border-rose-100 bg-white p-5 shadow-soft md:p-6" aria-labelledby="checklist-title">
      <details open>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
          <span>
            <span id="checklist-title" className="block text-[15px] font-semibold">Primeiros passos</span>
            <span className="mt-1 block text-xs text-muted">{completeRequired} de {required.length} concluídos</span>
          </span>
          <span className="text-xs font-semibold text-rose-700">Mostrar ou recolher</span>
        </summary>
        <div className="mt-4">
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-rose-50" role="progressbar" aria-label="Progresso dos primeiros passos" aria-valuemin={0} aria-valuemax={required.length} aria-valuenow={completeRequired}>
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${required.length ? (completeRequired / required.length) * 100 : 0}%` }} />
          </div>
          <ul className="divide-y divide-rose-50">
            {items.map((item) => (
              <li key={item.label}>
                <Link href={item.href} aria-disabled={!props.temAcesso} tabIndex={props.temAcesso ? undefined : -1} onClick={(event) => { if (!props.temAcesso) event.preventDefault(); }} title={!props.temAcesso ? "Disponível ao ativar o plano" : undefined} className={`flex min-h-12 items-center justify-between gap-3 py-2 text-sm text-ink hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 ${!props.temAcesso ? "cursor-not-allowed opacity-50" : ""}`}>
                  <span>{item.label}{item.optional && <span className="ml-1 text-xs text-muted">(opcional)</span>}</span>
                  {item.done ? <Check size={18} className="shrink-0 text-emerald-600" aria-label="Concluído" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-rose-200" aria-hidden="true" />}
                </Link>
              </li>
            ))}
          </ul>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <button type="button" disabled={saving} onClick={() => void hideChecklist()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-muted hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 disabled:opacity-60">
            <EyeOff size={15} aria-hidden="true" />{saving ? "Ocultando..." : "Ocultar"}
          </button>
        </div>
      </details>
    </section>
  );
}
