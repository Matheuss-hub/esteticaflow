"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, CalendarCheck2, Clock3, PackageCheck, Sparkles } from "lucide-react";
import { AppointmentList } from "@/components/appointment-list";
import { EmptyState, ErrorNotice, PageHeading, Panel } from "@/components/ui";
import { appointmentDate, dateKey, numeric, Row, text } from "@/lib/data";
import { CLINICA_ID, supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [packages, setPackages] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const results = await Promise.all([
        supabase.from("agendamentos").select("*").eq("clinica_id", CLINICA_ID),
        supabase.from("pacientes").select("*").eq("clinica_id", CLINICA_ID),
        supabase.from("servicos").select("*").eq("clinica_id", CLINICA_ID),
        supabase.from("pacotes").select("*").eq("clinica_id", CLINICA_ID),
      ]);
      const failed = results.find((result) => result.error);
      if (failed?.error) setError(failed.error.message);
      else {
        setAppointments((results[0].data ?? []) as Row[]);
        setPatients((results[1].data ?? []) as Row[]);
        setServices((results[2].data ?? []) as Row[]);
        setPackages((results[3].data ?? []) as Row[]);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const todayKey = dateKey(new Date());
  const todayAppointments = appointments.filter((item) => {
    const date = appointmentDate(item);
    return date ? dateKey(date) === todayKey : false;
  });
  const monthAppointments = appointments.filter((item) => {
    const date = appointmentDate(item);
    const status = text(item, "status").toLowerCase();
    return date && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear() &&
      (status === "realizado" || status === "faltou");
  });
  const attendanceRate = monthAppointments.length
    ? Math.round((monthAppointments.filter((item) => text(item, "status").toLowerCase() === "realizado").length / monthAppointments.length) * 100)
    : 0;
  const endingPackages = packages.filter((item) => numeric(item, "sessoes_usadas") >= numeric(item, "total") - 2);

  const patientNames = useMemo(() => new Map(patients.map((item) => [text(item, "id"), text(item, "nome", "name")])), [patients]);
  const patientPhones = useMemo(() => new Map(patients.map((item) => [text(item, "id"), text(item, "whatsapp", "telefone")])), [patients]);
  const serviceNames = useMemo(() => new Map(services.map((item) => [text(item, "id"), text(item, "nome", "name")])), [services]);

  return (
    <>
      <PageHeading
        eyebrow="Sábado, seu espaço floresce"
        title="Visão geral"
        description={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        action={
          <Link href="/agenda" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">
            Abrir agenda <ArrowRight size={16} />
          </Link>
        }
      />

      {error && <div className="mb-6"><ErrorNotice message={error} /></div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl bg-rose-600 p-5 text-white shadow-soft sm:p-6">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><CalendarCheck2 size={19} /></span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium">Hoje</span>
          </div>
          <p className="mt-6 text-sm text-rose-100">Agendamentos do dia</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="font-display text-4xl font-semibold">{loading ? "—" : todayAppointments.length}</p>
            <Link href="/agenda" className="mb-1 inline-flex items-center gap-1 text-xs text-rose-100 hover:text-white">Ver agenda <ArrowRight size={13} /></Link>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Sparkles size={19} /></span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">Este mês</span>
          </div>
          <p className="mt-6 text-sm text-muted">Taxa de comparecimento</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="font-display text-4xl font-semibold">{loading ? "—" : `${attendanceRate}%`}</p>
            <span className="mb-1 inline-flex items-center gap-1 text-xs text-emerald-700"><ArrowDownRight size={14} /> Presenças</span>
          </div>
          <p className="mt-2 text-[11px] text-muted">Calculada entre atendimentos realizados e faltas</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><PackageCheck size={19} /></span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">Atenção</span>
          </div>
          <p className="mt-6 text-sm text-muted">Pacotes acabando</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="font-display text-4xl font-semibold">{loading ? "—" : endingPackages.length}</p>
            <Link href="/pacotes" className="mb-1 inline-flex items-center gap-1 text-xs text-muted hover:text-rose-600">Ver pacotes <ArrowRight size={13} /></Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel
          title="Agenda de hoje"
          subtitle="Os próximos cuidados marcados para hoje"
          action={<Link href="/agenda" className="text-xs font-semibold text-rose-600 hover:text-rose-700">Ver tudo</Link>}
        >
          {loading && !error ? (
            <p className="py-8 text-center text-sm text-muted">Carregando agenda...</p>
          ) : (
            <AppointmentList appointments={todayAppointments} patientNames={patientNames} patientPhones={patientPhones} serviceNames={serviceNames} />
          )}
        </Panel>

        <Panel
          title="Pacotes acabando"
          subtitle="Só mais alguns cuidados para renovar"
          action={<Clock3 size={17} className="text-amber-500" />}
        >
          {loading && !error ? (
            <p className="py-8 text-center text-sm text-muted">Carregando pacotes...</p>
          ) : endingPackages.length === 0 ? (
            <EmptyState>Nenhum pacote perto do fim. Tudo em dia!</EmptyState>
          ) : (
            <div className="space-y-4">
              {endingPackages.slice(0, 5).map((item, index) => {
                const patient = patientNames.get(text(item, "paciente_id")) || "Paciente";
                const used = numeric(item, "sessoes_usadas");
                const total = numeric(item, "total");
                const service = serviceNames.get(text(item, "servico_id")) || "Tratamento";
                return (
                  <div key={text(item, "id") || index} className="rounded-xl border border-rose-50 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div><p className="text-sm font-semibold">{patient}</p><p className="mt-0.5 text-xs text-muted">{service}</p></div>
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">{total - used} restantes</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-rose-50">
                      <div className="h-full rounded-full bg-rose-400" style={{ width: `${total ? Math.min((used / total) * 100, 100) : 0}%` }} />
                    </div>
                  </div>
                );
              })}
              <Link href="/pacotes" className="flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-rose-600">Gerenciar pacotes <ArrowRight size={13} /></Link>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
