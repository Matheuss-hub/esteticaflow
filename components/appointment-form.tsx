"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { loadAppointmentFormData, saveAppointmentAction, savePatientAction } from "@/app/actions/clinic-data";
import { ErrorNotice, PageHeading, Panel } from "@/components/ui";
import { appointmentDate, Row, text } from "@/lib/data";

const TIME_ZONE = "America/Sao_Paulo";
const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-xs font-medium text-ink";

type FormData = { patients: Row[]; services: Row[]; packages: Row[]; members: Row[]; appointment: Row | null };

export function AppointmentForm({ appointmentId, initialPatientId = "", initialServiceId = "", initialPackageId = "" }: { appointmentId?: string; initialPatientId?: string; initialServiceId?: string; initialPackageId?: string }) {
  const router = useRouter();
  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patientId, setPatientId] = useState(initialPatientId);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [packageId, setPackageId] = useState(initialPackageId);
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [patientSearch, setPatientSearch] = useState("");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientError, setNewPatientError] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);

  useEffect(() => {
    loadAppointmentFormData(appointmentId).then((result) => {
      if ("error" in result) {
        setLoadError(result.error ?? "Não foi possível carregar o formulário.");
      } else {
        const loaded = result as FormData;
        setData(loaded);
        setServiceId(initialServiceId);
        setPackageId(initialPackageId);
        const initialService = loaded.services.find((service) => text(service, "id") === initialServiceId);
        if (initialService) setDuration(text(initialService, "duracao_minutos") || "60");
        const appointment = loaded.appointment;
        if (appointment) {
          setPatientId(text(appointment, "paciente_id"));
          setServiceId(text(appointment, "servico_id"));
          setPackageId(text(appointment, "pacote_id"));
          setProfessionalId(text(appointment, "profissional_id"));
          const appointmentAt = appointmentDate(appointment);
          if (appointmentAt) {
            setDate(formatInTimeZone(appointmentAt, TIME_ZONE, "yyyy-MM-dd"));
            setTime(formatInTimeZone(appointmentAt, TIME_ZONE, "HH:mm"));
          }
          setDuration(text(appointment, "duracao_minutos") || "60");
        }
      }
      setLoading(false);
    }).catch(() => {
      setLoadError("Não foi possível carregar o formulário. Tente novamente.");
      setLoading(false);
    });
  }, [appointmentId, initialServiceId, initialPackageId]);

  const selectedService = data?.services.find((service) => text(service, "id") === serviceId);
  const eligiblePackages = useMemo(() => (data?.packages ?? []).filter((pack) =>
    text(pack, "paciente_id") === patientId && text(pack, "servico_id") === serviceId &&
    text(pack, "status") === "ativo" && Number(pack.sessoes_usadas) < Number(pack.total_sessoes) &&
    (!text(pack, "validade") || text(pack, "validade") >= date),
  ), [data, patientId, serviceId, date]);
  const filteredPatients = (data?.patients ?? []).filter((patient) =>
    text(patient, "nome").toLocaleLowerCase("pt-BR").includes(patientSearch.trim().toLocaleLowerCase("pt-BR")) ||
    text(patient, "whatsapp").includes(patientSearch.replace(/\D/g, "")),
  );

  async function createPatientInline() {
    setCreatingPatient(true);
    setNewPatientError("");
    const formData = new globalThis.FormData();
    formData.set("nome", newPatientName);
    formData.set("whatsapp", newPatientPhone);
    const result = await savePatientAction(formData);
    if ("error" in result) {
      setNewPatientError(result.error ?? "Não foi possível cadastrar a paciente.");
    } else if (data) {
      const newPatient = { id: result.id, nome: newPatientName.trim(), whatsapp: newPatientPhone.replace(/\D/g, "") };
      setData({ ...data, patients: [...data.patients, newPatient] });
      setPatientId(result.id);
      setShowNewPatient(false);
      setNewPatientName("");
      setNewPatientPhone("");
    }
    setCreatingPatient(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date || !time) {
      setError("Informe a data e o horário.");
      return;
    }
    const scheduledAt = fromZonedTime(`${date}T${time}:00`, TIME_ZONE);
    if (scheduledAt.getTime() < Date.now() && !window.confirm("Este horário está no passado. Deseja continuar mesmo assim?")) return;
    setSaving(true);
    setError("");
    const formData = new globalThis.FormData(event.currentTarget);
    const result = await saveAppointmentAction(formData);
    if ("error" in result) {
      setError(result.error ?? "Não foi possível salvar o agendamento.");
      setSaving(false);
      return;
    }
    router.push("/agenda");
    router.refresh();
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted">Carregando dados do agendamento...</p>;
  if (loadError || !data) return <ErrorNotice message={loadError || "Não foi possível carregar o formulário."} />;

  return (
    <>
      <PageHeading eyebrow="Agenda da clínica" title={appointmentId ? "Editar agendamento" : "Novo agendamento"} description="Organize o próximo atendimento com todos os detalhes."
        action={<Link href="/agenda" className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={16} /> Voltar à agenda</Link>} />
      <form onSubmit={submit} className="space-y-5">
        {appointmentId && <input type="hidden" name="id" value={appointmentId} />}
        <Panel title="Atendimento">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="patient-search">Paciente *</label>
              <input id="patient-search" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Buscar por nome ou WhatsApp" className={inputClass} />
              <select required name="paciente_id" value={patientId} onChange={(event) => { setPatientId(event.target.value); setPackageId(""); }} className={`${inputClass} mt-2`}>
                <option value="">Selecione uma paciente</option>
                {filteredPatients.map((patient) => <option key={text(patient, "id")} value={text(patient, "id")}>{text(patient, "nome")} · {text(patient, "whatsapp")}</option>)}
              </select>
              <button type="button" onClick={() => setShowNewPatient(!showNewPatient)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><Plus size={14} /> Cadastrar paciente sem sair</button>
              {showNewPatient && <div className="mt-3 grid gap-3 rounded-xl border border-rose-100 p-3 sm:grid-cols-[1fr_1fr_auto]">
                <input value={newPatientName} onChange={(event) => setNewPatientName(event.target.value)} placeholder="Nome completo" className={inputClass} />
                <input value={newPatientPhone} onChange={(event) => setNewPatientPhone(event.target.value)} placeholder="WhatsApp com DDD" className={inputClass} />
                <button type="button" disabled={creatingPatient} onClick={() => void createPatientInline()} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{creatingPatient ? "Salvando..." : "Cadastrar"}</button>
                {newPatientError && <p role="alert" className="text-xs text-red-700 sm:col-span-3">{newPatientError}</p>}
              </div>}
            </div>
            <label><span className={labelClass}>Serviço *</span><select required name="servico_id" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setPackageId(""); const service = data.services.find((item) => text(item, "id") === event.target.value); setDuration(text(service ?? {}, "duracao_minutos") || "60"); }} className={inputClass}><option value="">Selecione</option>{data.services.map((service) => <option key={text(service, "id")} value={text(service, "id")}>{text(service, "nome")}</option>)}</select></label>
            <label><span className={labelClass}>Pacote (opcional)</span><select name="pacote_id" value={packageId} onChange={(event) => setPackageId(event.target.value)} className={inputClass}><option value="">Sem pacote</option>{eligiblePackages.map((pack) => <option key={text(pack, "id")} value={text(pack, "id")}>{text(pack, "nome")} · {Number(pack.total_sessoes) - Number(pack.sessoes_usadas)} sessões restantes</option>)}</select></label>
            <label><span className={labelClass}>Data *</span><input required name="data" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Hora *</span><input required name="hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Duração (minutos) *</span><input required name="duracao_minutos" type="number" min="5" max="720" value={duration} onChange={(event) => setDuration(event.target.value)} className={inputClass} /><span className="mt-1 block text-[11px] text-muted">Preenchida pela duração do serviço{selectedService ? ` (${text(selectedService, "duracao_minutos")} min)` : ""}; você pode ajustar.</span></label>
            <label><span className={labelClass}>Profissional/atendente</span><select name="profissional_id" value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className={inputClass}><option value="">Sem profissional definido</option>{data.members.map((member) => <option key={text(member, "user_id")} value={text(member, "user_id")}>{text(member, "nome") || "Membro"} · {text(member, "role") === "dona" ? "Dona" : "Atendente"}</option>)}</select></label>
            <label className="md:col-span-2"><span className={labelClass}>Observações</span><textarea name="observacoes" rows={3} defaultValue={text(data.appointment ?? {}, "observacoes")} className={inputClass} /></label>
          </div>
        </Panel>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><Save size={16} />{saving ? "Salvando..." : "Salvar agendamento"}</button></div>
      </form>
    </>
  );
}