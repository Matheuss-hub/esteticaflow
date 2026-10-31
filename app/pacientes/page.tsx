"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Plus, Search, UsersRound } from "lucide-react";
import { ErrorNotice, PageHeading, Panel, EmptyState } from "@/components/ui";
import { appointmentDate, dateOnly, formatDate, Row, text, whatsappLink } from "@/lib/data";
import { mensagemReativacao } from "@/lib/mensagens";
import { loadPatientsPageData } from "@/app/actions/clinic-data";

function lastVisitFor(patient: Row, appointments: Row[]): Date | null {
  const stored = dateOnly(text(patient, "ultima_visita", "ultima_visita_em", "last_visit"));
  if (stored) return stored;
  const patientId = text(patient, "id");
  const visits = appointments
    .filter((appointment) =>
      text(appointment, "paciente_id", "patient_id") === patientId &&
      text(appointment, "status").toLowerCase() === "realizado",
    )
    .map(appointmentDate)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime());
  return visits[0] ?? null;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Row[]>([]);
  const [appointments, setAppointments] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const result = await loadPatientsPageData();
      if ("error" in result) setError(result.error ?? "Não foi possível carregar as pacientes.");
      else {
        setPatients(result.patients as Row[]);
        setAppointments(result.appointments as Row[]);
        setError("");
      }
    } catch {
      setError("Não foi possível carregar as pacientes. Tente novamente.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const reactivationCutoff = new Date();
  reactivationCutoff.setDate(reactivationCutoff.getDate() - 60);
  const reactivationList = patients.filter((patient) => {
    const lastVisit = lastVisitFor(patient, appointments);
    return lastVisit !== null && lastVisit < reactivationCutoff;
  });
  const filteredPatients = patients.filter((patient) => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return !query || text(patient, "nome", "name").toLocaleLowerCase("pt-BR").includes(query) ||
      text(patient, "whatsapp", "telefone").includes(query);
  });

  return (
    <>
      <PageHeading eyebrow="Relacionamentos que florescem" title="Pacientes" description="Um espaço especial para cada pessoa que confia no seu cuidado."
        action={<Link href="/pacientes/novo" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"><Plus size={16} /> Novo paciente</Link>} />
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}

      <div className="mb-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Cadastro completo" subtitle="Organize contato, preferências e informações de atendimento">
          <Link href="/pacientes/novo" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Plus size={16} /> Abrir cadastro</Link>
        </Panel>

        <Panel
          title="Para reativar"
          subtitle="Pacientes sem uma visita há mais de 60 dias"
          action={<span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">{reactivationList.length} {reactivationList.length === 1 ? "pessoa" : "pessoas"}</span>}
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">Carregando pacientes...</p>
          ) : reactivationList.length === 0 ? (
            <EmptyState>Ninguém precisa de um lembrete por enquanto 🌸</EmptyState>
          ) : (
            <div className="divide-y divide-rose-50">
              {reactivationList.slice(0, 6).map((patient) => {
                const patientName = text(patient, "nome", "name") || "Paciente";
                const phone = text(patient, "whatsapp", "telefone");
                const lastVisit = lastVisitFor(patient, appointments);
                return (
                  <div key={text(patient, "id")} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-semibold text-amber-700">{patientName.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{patientName}</p><p className="mt-0.5 text-[11px] text-muted">Última visita: {formatDate(lastVisit)}</p></div>
                    {phone && <a href={whatsappLink(phone, mensagemReativacao(patientName))} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"><MessageCircle size={14} /> <span className="hidden sm:inline">Enviar no Zap</span></a>}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Todas as pacientes"
        subtitle={`${patients.length} ${patients.length === 1 ? "pessoa cadastrada" : "pessoas cadastradas"}`}
        action={
          <label className="flex items-center gap-2 rounded-lg border border-rose-100 px-3 py-2">
            <Search size={15} className="text-muted" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" aria-label="Buscar paciente" className="w-28 bg-transparent text-xs outline-none placeholder:text-muted sm:w-40" />
          </label>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Carregando pacientes...</p>
        ) : filteredPatients.length === 0 ? (
          <EmptyState><UsersRound className="mx-auto mb-2 text-rose-400" size={22} />Nenhuma paciente encontrada.</EmptyState>
        ) : (
          <div className="divide-y divide-rose-50">
            {filteredPatients.map((patient) => {
              const patientName = text(patient, "nome", "name") || "Paciente";
              const phone = text(patient, "whatsapp", "telefone");
              return (
                <Link href={`/pacientes/${text(patient, "id")}`} key={text(patient, "id")} className="flex items-center gap-3 py-3.5 hover:bg-rose-50/50">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">{patientName.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{patientName}</p><p className="mt-0.5 text-xs text-muted">{phone || "Sem WhatsApp cadastrado"}</p></div>
                  <span className="hidden text-xs text-muted sm:block">Última visita: {formatDate(lastVisitFor(patient, appointments))}</span>
                  {phone && <a href={whatsappLink(phone, `Oi, ${patientName}! 💕 Como podemos cuidar de você hoje?`)} target="_blank" rel="noreferrer" aria-label={`Enviar mensagem para ${patientName}`} className="rounded-lg border border-rose-100 p-2 text-emerald-600 hover:bg-emerald-50"><MessageCircle size={16} /></a>}
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}
