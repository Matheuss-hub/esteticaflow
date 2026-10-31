"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, MessageCircle, PackagePlus, Pencil } from "lucide-react";
import { loadPatientDetailAction } from "@/app/actions/clinic-data";
import { PatientForm } from "@/components/patient-form";
import { EmptyState, ErrorNotice, PageHeading, Panel } from "@/components/ui";
import { appointmentDate, formatDate, formatTime, Row, statusLabel, text } from "@/lib/data";
import { mensagemAgendamento } from "@/lib/mensagens";
import { whatsappLink } from "@/lib/data";

type PatientData = { patient: Row; appointments: Row[]; packages: Row[]; services: Row[] };

function usePatient(patientId: string) {
  const [data, setData] = useState<PatientData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadPatientDetailAction(patientId).then((result) => {
      if ("error" in result) setError(result.error ?? "Não foi possível carregar a paciente.");
      else setData(result as PatientData);
      setLoading(false);
    }).catch(() => {
      setError("Não foi possível carregar os dados da paciente.");
      setLoading(false);
    });
  }, [patientId]);
  return { data, error, loading };
}

export function PatientEditPage({ patientId }: { patientId: string }) {
  const { data, error, loading } = usePatient(patientId);
  if (loading) return <p className="py-10 text-center text-sm text-muted">Carregando paciente...</p>;
  if (error || !data) return <ErrorNotice message={error || "Paciente não encontrada."} />;
  return <PatientForm patient={data.patient} />;
}

export function PatientDetailPage({ patientId }: { patientId: string }) {
  const { data, error, loading } = usePatient(patientId);
  if (loading) return <p className="py-10 text-center text-sm text-muted">Carregando paciente...</p>;
  if (error || !data) return <ErrorNotice message={error || "Paciente não encontrada."} />;

  const { patient, appointments, packages, services } = data;
  const name = text(patient, "nome") || "Paciente";
  const phone = text(patient, "whatsapp");
  const serviceNames = new Map(services.map((service) => [text(service, "id"), text(service, "nome")]));
  const activePackages = packages.filter((pack) => text(pack, "status") === "ativo");
  const upcomingAppointments = [...appointments].sort((a, b) => (appointmentDate(b)?.getTime() ?? 0) - (appointmentDate(a)?.getTime() ?? 0));
  const nextAppointment = upcomingAppointments.find((item) => {
    const date = appointmentDate(item);
    return date && date.getTime() >= Date.now() && !["cancelado", "faltou"].includes(text(item, "status"));
  });

  return (
    <>
      <PageHeading eyebrow="Ficha da paciente" title={name} description={phone || "Sem WhatsApp cadastrado"}
        action={<div className="flex flex-wrap gap-2">
          <Link href="/pacientes" className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm font-semibold"><ArrowLeft size={16} /> Voltar</Link>
          <Link href={`/pacientes/${patientId}/editar`} className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm font-semibold"><Pencil size={15} /> Editar</Link>
          <Link href={`/agenda/novo?paciente_id=${patientId}`} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white"><CalendarPlus size={16} /> Agendar</Link>
          <Link href={`/pacotes/novo?paciente_id=${patientId}`} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-semibold text-rose-700"><PackagePlus size={16} /> Novo pacote</Link>
          {phone && <a href={whatsappLink(phone, `Oi, ${name}! Como podemos cuidar de você hoje?`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white"><MessageCircle size={16} /> Enviar no Zap</a>}
        </div>} />

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Dados pessoais">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Nome completo</dt><dd className="mt-1 font-medium">{name}</dd></div>
            <div><dt className="text-xs text-muted">WhatsApp</dt><dd className="mt-1 font-medium">{phone || "Não informado"}</dd></div>
            <div><dt className="text-xs text-muted">E-mail</dt><dd className="mt-1 font-medium">{text(patient, "email") || "Não informado"}</dd></div>
            <div><dt className="text-xs text-muted">Nascimento</dt><dd className="mt-1 font-medium">{formatDate(patient.data_nascimento ? new Date(`${text(patient, "data_nascimento").slice(0, 10)}T12:00:00-03:00`) : null)}</dd></div>
            <div><dt className="text-xs text-muted">CPF</dt><dd className="mt-1 font-medium">{text(patient, "cpf") || "Não informado"}</dd></div>
            <div><dt className="text-xs text-muted">Como conheceu</dt><dd className="mt-1 font-medium">{text(patient, "como_conheceu") || "Não informado"}</dd></div>
            <div><dt className="text-xs text-muted">Consentimento WhatsApp</dt><dd className="mt-1 font-medium">{patient.consentimento_whatsapp ? "Autorizado" : "Não autorizado"}{text(patient, "consentimento_whatsapp_em") ? ` · ${formatDate(new Date(text(patient, "consentimento_whatsapp_em")))}` : ""}</dd></div>
          </dl>
        </Panel>
        <Panel title="Anamnese e observações">
          <dl className="space-y-4 text-sm">
            <div><dt className="text-xs text-muted">Alergias</dt><dd className="mt-1 whitespace-pre-wrap">{text(patient, "alergias") || "Não informado"}</dd></div>
            <div><dt className="text-xs text-muted">Gestante ou lactante</dt><dd className="mt-1">{patient.gestante_lactante ? "Sim" : "Não"}</dd></div>
            <div><dt className="text-xs text-muted">Medicamentos em uso</dt><dd className="mt-1 whitespace-pre-wrap">{text(patient, "medicamentos_uso") || "Não informado"}</dd></div>
            <div><dt className="text-xs text-muted">Condições de saúde</dt><dd className="mt-1 whitespace-pre-wrap">{text(patient, "condicoes_saude") || "Não informado"}</dd></div>
            <div><dt className="text-xs text-muted">Observações</dt><dd className="mt-1 whitespace-pre-wrap">{text(patient, "observacoes") || "Não informado"}</dd></div>
          </dl>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Pacotes ativos" subtitle={`${activePackages.length} em andamento`}>
          {activePackages.length === 0 ? <EmptyState>Nenhum pacote ativo para esta paciente.</EmptyState> : <div className="space-y-3">{activePackages.map((pack) => <Link key={text(pack, "id")} href={`/pacotes/${text(pack, "id")}`} className="block rounded-xl border border-rose-100 p-4 hover:bg-rose-50/50"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{text(pack, "nome")}</p><p className="mt-1 text-xs text-muted">{serviceNames.get(text(pack, "servico_id")) || "Serviço"}</p></div><span className="text-xs font-semibold text-rose-700">{Math.max(Number(pack.total_sessoes) - Number(pack.sessoes_usadas), 0)} restantes</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-50"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.min(Number(pack.sessoes_usadas) / Math.max(Number(pack.total_sessoes), 1) * 100, 100)}%` }} /></div></Link>)}</div>}
        </Panel>
        <Panel title="Histórico de agendamentos" subtitle={`${appointments.length} registros`}>
          {appointments.length === 0 ? <EmptyState>Nenhum agendamento registrado.</EmptyState> : <div className="divide-y divide-rose-50">{upcomingAppointments.map((item) => {
            const date = appointmentDate(item);
            const service = serviceNames.get(text(item, "servico_id")) || "Atendimento";
            return <div key={text(item, "id")} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{service}</p><p className="mt-1 text-xs text-muted">{formatDate(date)} · {formatTime(item)}</p></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold">{statusLabel(text(item, "status"))}</span></div>;
          })}</div>}
          {nextAppointment && <Link href={`/agenda/${text(nextAppointment, "id")}/editar`} className="mt-3 inline-flex text-xs font-semibold text-rose-700">Abrir próximo agendamento</Link>}
        </Panel>
      </div>
    </>
  );
}