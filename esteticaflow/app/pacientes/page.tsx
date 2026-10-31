"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Search, UsersRound } from "lucide-react";
import { ErrorNotice, PageHeading, Panel, EmptyState } from "@/components/ui";
import { appointmentDate, dateOnly, formatDate, Row, text, whatsappLink } from "@/lib/data";
import { CLINICA_ID, supabase } from "@/lib/supabase";

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
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [formError, setFormError] = useState("");

  async function load() {
    const results = await Promise.all([
      supabase.from("pacientes").select("*").eq("clinica_id", CLINICA_ID),
      supabase.from("agendamentos").select("*").eq("clinica_id", CLINICA_ID),
    ]);
    const failed = results.find((result) => result.error);
    if (failed?.error) setError(failed.error.message);
    else {
      setPatients((results[0].data ?? []) as Row[]);
      setAppointments((results[1].data ?? []) as Row[]);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const reactivationCutoff = new Date();
  reactivationCutoff.setDate(reactivationCutoff.getDate() - 60);
  const reactivationList = useMemo(
    () => patients.filter((patient) => {
      const lastVisit = lastVisitFor(patient, appointments);
      return lastVisit !== null && lastVisit < reactivationCutoff;
    }),
    [patients, appointments, reactivationCutoff.getTime()],
  );
  const filteredPatients = patients.filter((patient) => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return !query || text(patient, "nome", "name").toLocaleLowerCase("pt-BR").includes(query) ||
      text(patient, "whatsapp", "telefone").includes(query);
  });

  async function addPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const result = await supabase.from("pacientes").insert({
      clinica_id: CLINICA_ID,
      nome: name.trim(),
      whatsapp: whatsapp.trim(),
    });
    if (result.error) setFormError(result.error.message);
    else {
      setName("");
      setWhatsapp("");
      await load();
    }
    setSaving(false);
  }

  return (
    <>
      <PageHeading eyebrow="Relacionamentos que florescem" title="Pacientes" description="Um espaço especial para cada pessoa que confia no seu cuidado." />
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}

      <div className="mb-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Cadastrar paciente" subtitle="Adicione alguém à sua lista de cuidados">
          <form onSubmit={addPatient} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink">Nome completo</span>
              <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Ana Costa" className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink">WhatsApp</span>
              <input required type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="(11) 99999-9999" className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            </label>
            {formError && <p role="alert" className="text-xs text-red-700">{formError}</p>}
            <button disabled={saving} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
              <Plus size={16} /> {saving ? "Salvando..." : "Adicionar paciente"}
            </button>
          </form>
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
                    {phone && <a href={whatsappLink(phone, `Oi, ${patientName}! 💕 Sentimos sua falta por aqui. Que tal agendar um momento especial de autocuidado?`)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"><MessageCircle size={14} /> <span className="hidden sm:inline">Enviar no Zap</span></a>}
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
                <div key={text(patient, "id")} className="flex items-center gap-3 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">{patientName.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{patientName}</p><p className="mt-0.5 text-xs text-muted">{phone || "Sem WhatsApp cadastrado"}</p></div>
                  <span className="hidden text-xs text-muted sm:block">Última visita: {formatDate(lastVisitFor(patient, appointments))}</span>
                  {phone && <a href={whatsappLink(phone, `Oi, ${patientName}! 💕 Como podemos cuidar de você hoje?`)} target="_blank" rel="noreferrer" aria-label={`Enviar mensagem para ${patientName}`} className="rounded-lg border border-rose-100 p-2 text-emerald-600 hover:bg-emerald-50"><MessageCircle size={16} /></a>}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}
