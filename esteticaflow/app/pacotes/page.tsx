"use client";

import { FormEvent, useEffect, useState } from "react";
import { MessageCircle, PackagePlus } from "lucide-react";
import { ErrorNotice, EmptyState, PageHeading, Panel } from "@/components/ui";
import { numeric, Row, text, whatsappLink } from "@/lib/data";
import { CLINICA_ID, supabase } from "@/lib/supabase";

export default function PackagesPage() {
  const [packages, setPackages] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [patientId, setPatientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [total, setTotal] = useState("10");
  const [used, setUsed] = useState("0");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const results = await Promise.all([
      supabase.from("pacotes").select("*").eq("clinica_id", CLINICA_ID),
      supabase.from("pacientes").select("*").eq("clinica_id", CLINICA_ID),
      supabase.from("servicos").select("*").eq("clinica_id", CLINICA_ID),
    ]);
    const failed = results.find((result) => result.error);
    if (failed?.error) setError(failed.error.message);
    else {
      setPackages((results[0].data ?? []) as Row[]);
      setPatients((results[1].data ?? []) as Row[]);
      setServices((results[2].data ?? []) as Row[]);
      setError("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const result = await supabase.from("pacotes").insert({
      clinica_id: CLINICA_ID,
      paciente_id: patientId,
      servico_id: serviceId,
      total: Number(total),
      sessoes_usadas: Number(used),
    });
    if (result.error) setFormError(result.error.message);
    else {
      setPatientId("");
      setServiceId("");
      setTotal("10");
      setUsed("0");
      await load();
    }
    setSaving(false);
  }

  const patientsById = new Map(patients.map((patient) => [text(patient, "id"), patient]));
  const servicesById = new Map(services.map((service) => [text(service, "id"), text(service, "nome", "name")]));

  return (
    <>
      <PageHeading eyebrow="Cuidado contínuo" title="Pacotes" description="Acompanhe cada etapa do plano de cuidado das suas pacientes." />
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <Panel title="Criar pacote" subtitle="Monte um plano personalizado">
          {patients.length === 0 || services.length === 0 ? (
            <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Cadastre ao menos uma paciente e um serviço no Supabase para criar um pacote.
            </div>
          ) : (
            <form onSubmit={addPackage} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium">Paciente</span>
                <select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none focus:border-rose-400">
                  <option value="">Selecione uma paciente</option>
                  {patients.map((patient) => <option key={text(patient, "id")} value={text(patient, "id")}>{text(patient, "nome", "name")}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium">Serviço</span>
                <select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none focus:border-rose-400">
                  <option value="">Selecione um serviço</option>
                  {services.map((service) => <option key={text(service, "id")} value={text(service, "id")}>{text(service, "nome", "name")}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium">Total de sessões</span>
                  <input required min="1" type="number" value={total} onChange={(event) => setTotal(event.target.value)} className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none focus:border-rose-400" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium">Já utilizadas</span>
                  <input required min="0" type="number" value={used} onChange={(event) => setUsed(event.target.value)} className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none focus:border-rose-400" />
                </label>
              </div>
              {formError && <p role="alert" className="text-xs text-red-700">{formError}</p>}
              <button disabled={saving} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
                <PackagePlus size={16} /> {saving ? "Salvando..." : "Criar pacote"}
              </button>
            </form>
          )}
        </Panel>

        <Panel title="Pacotes ativos" subtitle={`${packages.length} ${packages.length === 1 ? "pacote cadastrado" : "pacotes cadastrados"}`}>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted">Carregando pacotes...</p>
          ) : packages.length === 0 ? (
            <EmptyState>Seus pacotes cadastrados aparecerão aqui.</EmptyState>
          ) : (
            <div className="space-y-3">
              {packages.map((item, index) => {
                const patient = patientsById.get(text(item, "paciente_id"));
                const patientName = patient ? text(patient, "nome", "name") : "Paciente";
                const phone = patient ? text(patient, "whatsapp", "telefone") : "";
                const service = servicesById.get(text(item, "servico_id")) || "Tratamento";
                const totalSessions = numeric(item, "total");
                const usedSessions = numeric(item, "sessoes_usadas");
                const remaining = Math.max(totalSessions - usedSessions, 0);
                const progress = totalSessions > 0 ? Math.min((usedSessions / totalSessions) * 100, 100) : 0;
                const ending = usedSessions >= totalSessions - 2;
                return (
                  <div key={text(item, "id") || index} className="rounded-xl border border-rose-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><PackagePlus size={18} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{patientName}</p>{ending && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Quase no fim</span>}</div>
                        <p className="mt-1 text-xs text-muted">{service}</p>
                        <div className="mt-3 flex items-center justify-between text-[11px]">
                          <span className="text-muted">{usedSessions} de {totalSessions} sessões utilizadas</span>
                          <span className="font-semibold text-rose-700">{remaining} restantes</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-rose-50">
                          <div className={`h-full rounded-full ${ending ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      {phone && ending && <a href={whatsappLink(phone, `Oi, ${patientName}! 💕 Seu pacote de ${service} está chegando ao fim. Vamos conversar sobre a renovação?`)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"><MessageCircle size={14} /> Enviar no Zap</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
