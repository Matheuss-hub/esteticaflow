import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export type Row = Record<string, unknown>;

const TIME_ZONE = "America/Sao_Paulo";

export function text(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

export function numeric(row: Row, ...keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

export function appointmentDate(row: Row): Date | null {
  const raw = text(
    row,
    "data_hora",
    "data_agendamento",
    "scheduled_at",
    "start_at",
    "inicio",
    "data",
  );
  if (!raw) return null;

  const time = text(row, "horario", "hora", "horario_inicio", "time");
  const value = raw.includes("T") || !time ? raw : `${raw}T${time}`;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const parsed = hasTimezone ? new Date(value) : fromZonedTime(value, TIME_ZONE);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dateKey(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, "yyyy-MM-dd");
}

export function dateOnly(value: string): Date | null {
  if (!value) return null;
  const parsed = fromZonedTime(`${value.slice(0, 10)}T12:00:00`, TIME_ZONE);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTime(row: Row): string {
  const date = appointmentDate(row);
  return date
    ? formatInTimeZone(date, TIME_ZONE, "HH:mm")
    : "--:--";
}

export function formatDate(value: Date | null): string {
  return value
    ? formatInTimeZone(value, TIME_ZONE, "dd/MM/yyyy", { locale: ptBR })
    : "Sem data";
}

export function formatDateLong(value: Date, pattern = "EEEE, d 'de' MMMM"): string {
  return formatInTimeZone(value, TIME_ZONE, pattern, { locale: ptBR });
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    agendado: "Agendado",
    confirmado: "Confirmado",
    faltou: "Faltou",
    realizado: "Realizado",
  };
  return labels[status.toLowerCase()] ?? status ?? "Agendado";
}

export function whatsappLink(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "");
  while (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

export function appointmentMessage(patient: string, service: string, date: Date | null): string {
  const when = date
    ? formatInTimeZone(date, TIME_ZONE, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : "em breve";
  return `Oi, ${patient}! 💕 Passando para confirmar seu horário de ${service || "atendimento"} no EsteticaFlow, ${when}. Podemos confirmar?`;
}
