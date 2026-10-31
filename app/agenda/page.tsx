"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDays } from "date-fns";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentList } from "@/components/appointment-list";
import { ErrorNotice, PageHeading, Panel } from "@/components/ui";
import { appointmentDate, dateKey, dateOnly, formatDateLong, Row, text } from "@/lib/data";
import { loadAgendaData } from "@/app/actions/data";

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [members, setMembers] = useState<Row[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [professionalFilter, setProfessionalFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await loadAgendaData();
        if ("error" in result) setError(result.error ?? "Não foi possível carregar a agenda.");
        else {
          setAppointments(result.appointments as Row[]);
          setPatients(result.patients as Row[]);
          setServices(result.services as Row[]);
          setMembers(result.members as Row[]);
        }
      } catch {
        setError("Não foi possível carregar a agenda. Tente novamente.");
      }
      setLoading(false);
    }
    void load();
  }, []);

  const patientsById = useMemo(() => new Map(patients.map((item) => [text(item, "id"), text(item, "nome", "name")])), [patients]);
  const phonesById = useMemo(() => new Map(patients.map((item) => [text(item, "id"), text(item, "whatsapp", "telefone")])), [patients]);
  const servicesById = useMemo(() => new Map(services.map((item) => [text(item, "id"), text(item, "nome", "name")])), [services]);
  const professionalNames = useMemo(() => new Map(members.map((member) => [text(member, "user_id"), text(member, "nome") || "Membro"])), [members]);
  const dayAppointments = appointments.filter((item) => {
    const date = appointmentDate(item);
    return date && dateKey(date) === selectedDate && (!professionalFilter || text(item, "profissional_id") === professionalFilter);
  });
  const selected = dateOnly(selectedDate) ?? new Date();

  function moveDay(days: number) {
    setSelectedDate(dateKey(addDays(selected, days)));
  }

  return (
    <>
      <PageHeading
        eyebrow="Cada encontro importa"
        title="Agenda"
        description="Acompanhe seus horários e cuide de cada detalhe."
        action={<div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm shadow-sm">
            <CalendarDays size={16} className="text-rose-500" />
            <span className="sr-only">Selecionar data</span>
            <input aria-label="Selecionar data da agenda" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent text-sm outline-none" />
          </label>
          <Link href="/agenda/novo" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"><CalendarPlus size={16} /> Novo agendamento</Link>
        </div>}
      />
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
      <Panel
        title={formatDateLong(selected)}
        subtitle={`${dayAppointments.length} ${dayAppointments.length === 1 ? "horário" : "horários"} no dia`}
        action={
          <div className="flex flex-wrap items-center gap-1">
            <label className="mr-1 text-[11px] text-muted"><span className="sr-only">Filtrar por profissional</span><select value={professionalFilter} onChange={(event) => setProfessionalFilter(event.target.value)} className="max-w-[155px] rounded-lg border border-rose-100 bg-white px-2 py-2 text-xs"><option value="">Todos os profissionais</option>{members.map((member) => <option key={text(member, "user_id")} value={text(member, "user_id")}>{text(member, "nome") || "Membro"}</option>)}</select></label>
            <button type="button" aria-label="Dia anterior" onClick={() => moveDay(-1)} className="rounded-lg border border-rose-100 p-2 text-muted hover:bg-rose-50"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => setSelectedDate(dateKey(new Date()))} className="rounded-lg border border-rose-100 px-3 py-2 text-xs font-medium text-muted hover:bg-rose-50">Hoje</button>
            <button type="button" aria-label="Próximo dia" onClick={() => moveDay(1)} className="rounded-lg border border-rose-100 p-2 text-muted hover:bg-rose-50"><ChevronRight size={17} /></button>
          </div>
        }
      >
        {loading && !error ? (
          <p className="py-8 text-center text-sm text-muted">Carregando agenda...</p>
        ) : (
          <AppointmentList appointments={dayAppointments} patientNames={patientsById} patientPhones={phonesById} serviceNames={servicesById} professionalNames={professionalNames} editable />
        )}
      </Panel>
      <p className="mt-4 text-xs text-muted">Os horários consideram o fuso de São Paulo. Ao marcar como realizado, sessões do pacote são atualizadas automaticamente.</p>
    </>
  );
}
