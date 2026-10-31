"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Check, CircleX, MessageCircle, UserRoundCheck } from "lucide-react";
import { changeAppointmentStatusAction } from "@/app/actions/clinic-data";
import {
  appointmentDate,
  formatTime,
  Row,
  text,
  whatsappLink,
} from "@/lib/data";
import { mensagemAgendamento } from "@/lib/mensagens";
import { EmptyState } from "@/components/ui";

const statusClass: Record<string, string> = {
  agendado: "bg-amber-50 text-amber-700",
  confirmado: "bg-sky-50 text-sky-700",
  faltou: "bg-red-50 text-red-700",
  realizado: "bg-emerald-50 text-emerald-700",
};

export function AppointmentList({
  appointments,
  patientNames,
  patientPhones,
  serviceNames,
  professionalNames,
  editable = false,
}: {
  appointments: Row[];
  patientNames: Map<string, string>;
  patientPhones: Map<string, string>;
  serviceNames: Map<string, string>;
  professionalNames?: Map<string, string>;
  editable?: boolean;
}) {
  const sorted = useMemo(
    () => [...appointments].sort((a, b) => (appointmentDate(a)?.getTime() ?? 0) - (appointmentDate(b)?.getTime() ?? 0)),
    [appointments],
  );

  if (sorted.length === 0) return <EmptyState>Nenhum horário encontrado para este dia.</EmptyState>;

  return (
    <div className="divide-y divide-rose-50">
      {sorted.map((appointment, index) => {
        const patientId = text(appointment, "paciente_id", "patient_id");
        const serviceId = text(appointment, "servico_id", "service_id");
        const patientName =
          patientNames.get(patientId) || text(appointment, "paciente_nome", "nome_paciente") || "Paciente";
        const serviceName =
          serviceNames.get(serviceId) || text(appointment, "servico_nome", "nome_servico") || "Atendimento";
        const status = text(appointment, "status").toLowerCase() || "agendado";
        const phone = patientPhones.get(patientId) || text(appointment, "whatsapp");
        const id = text(appointment, "id") || `${patientId}-${index}`;
        const date = appointmentDate(appointment);
        return (
          <div key={id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <div className="w-16 shrink-0 text-sm font-semibold tabular-nums text-ink">{formatTime(appointment)}</div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">
              {patientName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{patientName}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{serviceName}</p>
              {professionalNames?.get(text(appointment, "profissional_id")) && <p className="mt-1 truncate text-[11px] text-muted">{professionalNames.get(text(appointment, "profissional_id"))}</p>}
            </div>
            <div className="flex items-center gap-2 pl-16 sm:pl-0">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass[status] || "bg-rose-50 text-rose-700"}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              {phone && (
                <a
                  href={date ? whatsappLink(phone, mensagemAgendamento(patientName, serviceName, date)) : undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Enviar mensagem para ${patientName}`}
                  className="rounded-lg border border-rose-100 p-2 text-emerald-600 transition hover:bg-emerald-50"
                >
                  <MessageCircle size={16} />
                </a>
              )}
            </div>
            {editable && <AppointmentActions id={id} status={status} />}
          </div>
        );
      })}
    </div>
  );
}

function AppointmentActions({ id, status }: { id: string; status: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: string) {
    setSaving(true);
    setError("");
    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", nextStatus);
    const result = await changeAppointmentStatusAction(formData);
    if ("error" in result) {
      setError(result.error ?? "Não foi possível atualizar o agendamento.");
      setSaving(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 pl-16 sm:pl-0">
      {status === "agendado" && <button type="button" title="Confirmar" disabled={saving} onClick={() => void updateStatus("confirmado")} className="rounded-lg border border-sky-100 p-2 text-sky-700 hover:bg-sky-50"><Check size={15} /></button>}
      {!['cancelado', 'realizado'].includes(status) && <Link href={`/agenda/${id}/editar`} title="Remarcar ou editar" className="rounded-lg border border-rose-100 p-2 text-rose-700 hover:bg-rose-50"><CalendarClock size={15} /></Link>}
      {!['cancelado', 'realizado', 'faltou'].includes(status) && <button type="button" title="Marcar como faltou" disabled={saving} onClick={() => void updateStatus("faltou")} className="rounded-lg border border-amber-100 p-2 text-amber-700 hover:bg-amber-50"><UserRoundCheck size={15} /></button>}
      {!['cancelado', 'realizado'].includes(status) && <button type="button" title="Marcar como realizado" disabled={saving} onClick={() => void updateStatus("realizado")} className="rounded-lg border border-emerald-100 p-2 text-emerald-700 hover:bg-emerald-50"><Check size={15} /></button>}
      {!['cancelado', 'realizado'].includes(status) && <button type="button" title="Cancelar" disabled={saving} onClick={() => void updateStatus("cancelado")} className="rounded-lg border border-red-100 p-2 text-red-700 hover:bg-red-50"><CircleX size={15} /></button>}
      {error && <span role="alert" className="basis-full text-xs text-red-700">{error}</span>}
    </div>
  );
}
