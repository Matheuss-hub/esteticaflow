"use client";

import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import {
  appointmentDate,
  appointmentMessage,
  formatTime,
  Row,
  text,
  whatsappLink,
} from "@/lib/data";
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
}: {
  appointments: Row[];
  patientNames: Map<string, string>;
  patientPhones: Map<string, string>;
  serviceNames: Map<string, string>;
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
        return (
          <div key={id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <div className="w-16 shrink-0 text-sm font-semibold tabular-nums text-ink">{formatTime(appointment)}</div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">
              {patientName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{patientName}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{serviceName}</p>
            </div>
            <div className="flex items-center gap-2 pl-16 sm:pl-0">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass[status] || "bg-rose-50 text-rose-700"}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              {phone && (
                <a
                  href={whatsappLink(phone, appointmentMessage(patientName, serviceName, appointmentDate(appointment)))}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Enviar mensagem para ${patientName}`}
                  className="rounded-lg border border-rose-100 p-2 text-emerald-600 transition hover:bg-emerald-50"
                >
                  <MessageCircle size={16} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
