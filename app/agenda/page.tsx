"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentList } from "@/components/appointment-list";
import { ErrorNotice, PageHeading, Panel } from "@/components/ui";
import { appointmentDate, dateKey, Row, text } from "@/lib/data";
import { CLINICA_ID, supabase } from "@/lib/supabase";

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results = await Promise.all([
        supabase.from("agendamentos").select("*").eq("clinica_id", CLINICA_ID),
        supabase.from("pacientes").select("*").eq("clinica_id", CLINICA_ID),
        supabase.from("servicos").select("*").eq("clinica_id", CLINICA_ID),
      ]);
      const failed = results.find((result) => result.error);
      if (failed?.error) setError(failed.error.message);
      else {
        setAppointments((results[0].data ?? []) as Row[]);
        setPatients((results[1].data ?? []) as Row[]);
        setServices((results[2].data ?? []) as Row[]);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const patientsById = useMemo(() => new Map(patients.map((item) => [text(item, "id"), text(item, "nome", "name")])), [patients]);
  const phonesById = useMemo(() => new Map(patients.map((item) => [text(item, "id"), text(item, "whatsapp", "telefone")])), [patients]);
  const servicesById = useMemo(() => new Map(services.map((item) => [text(item, "id"), text(item, "nome", "name")])), [services]);
  const dayAppointments = appointments.filter((item) => {
    const date = appointmentDate(item);
    return date ? dateKey(date) === selectedDate : false;
  });
  const selected = new Date(`${selectedDate}T12:00:00`);

  function moveDay(days: number) {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(dateKey(next));
  }

  return (
    <>
      <PageHeading
        eyebrow="Cada encontro importa"
        title="Agenda"
        description="Acompanhe seus horários e cuide de cada detalhe."
        action={
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm shadow-sm">
            <CalendarDays size={16} className="text-rose-500" />
            <span className="sr-only">Selecionar data</span>
            <input aria-label="Selecionar data da agenda" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-transparent text-sm outline-none" />
          </label>
        }
      />
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
      <Panel
        title={selected.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        subtitle={`${dayAppointments.length} ${dayAppointments.length === 1 ? "horário" : "horários"} no dia`}
        action={
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Dia anterior" onClick={() => moveDay(-1)} className="rounded-lg border border-rose-100 p-2 text-muted hover:bg-rose-50"><ChevronLeft size={17} /></button>
            <button type="button" onClick={() => setSelectedDate(dateKey(new Date()))} className="rounded-lg border border-rose-100 px-3 py-2 text-xs font-medium text-muted hover:bg-rose-50">Hoje</button>
            <button type="button" aria-label="Próximo dia" onClick={() => moveDay(1)} className="rounded-lg border border-rose-100 p-2 text-muted hover:bg-rose-50"><ChevronRight size={17} /></button>
          </div>
        }
      >
        {loading && !error ? (
          <p className="py-8 text-center text-sm text-muted">Carregando agenda...</p>
        ) : (
          <AppointmentList appointments={dayAppointments} patientNames={patientsById} patientPhones={phonesById} serviceNames={servicesById} />
        )}
      </Panel>
      <p className="mt-4 text-xs text-muted">Status disponíveis: Agendado · Confirmado · Faltou · Realizado. Os status são exibidos conforme cadastrados no Supabase.</p>
    </>
  );
}
