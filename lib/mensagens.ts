import { formatInTimeZone } from "date-fns-tz";

const TIME_ZONE = "America/Sao_Paulo";

export function mensagemAgendamento(paciente: string, servico: string, dataHora: Date): string {
  const quando = formatInTimeZone(dataHora, TIME_ZONE, "dd/MM/yyyy 'às' HH:mm");
  return `Oi, ${paciente}! Passando para confirmar seu horário de ${servico} no dia ${quando}. Podemos confirmar?`;
}

export function mensagemReativacao(paciente: string): string {
  return `Oi, ${paciente}! Sentimos sua falta. Que tal agendar seu próximo momento de autocuidado?`;
}

export function mensagemPacote(paciente: string, pacote: string, restantes: number): string {
  return restantes > 0
    ? `Oi, ${paciente}! Seu pacote ${pacote} está chegando ao fim (${restantes} ${restantes === 1 ? "sessão restante" : "sessões restantes"}). Vamos conversar sobre a renovação?`
    : `Oi, ${paciente}! Seu pacote ${pacote} foi concluído. Vamos conversar sobre a renovação?`;
}