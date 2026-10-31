export type Row = Record<string, unknown>;

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
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateOnly(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTime(row: Row): string {
  const date = appointmentDate(row);
  return date
    ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";
}

export function formatDate(value: Date | null): string {
  return value
    ? value.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "Sem data";
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
  const digits = phone.replace(/\D/g, "").replace(/^55/, "");
  return `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
}

export function appointmentMessage(patient: string, service: string, date: Date | null): string {
  const when = date
    ? date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "em breve";
  return `Oi, ${patient}! 💕 Passando para confirmar seu horário de ${service || "atendimento"} no EsteticaFlow, ${when}. Podemos confirmar?`;
}
