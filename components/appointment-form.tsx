"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { loadAppointmentFormData, saveAppointmentAction, savePatientAction } from "@/app/actions/clinic-data";
import { saveServiceAction } from "@/app/actions/services";
import { ErrorNotice, PageHeading, Panel } from "@/components/ui";
import { appointmentDate, Row, text } from "@/lib/data";
import { normalizarNomeServico } from "@/lib/servicos";

const TIME_ZONE = "America/Sao_Paulo";
const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-xs font-medium text-ink";

type FormData = { patients: Row[]; services: Row[]; packages: Row[]; members: Row[]; appointment: Row | null; role: string; temAcesso: boolean };
type ComboOption = { id: string; label: string; description?: string };

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function SearchCombobox({
  id,
  label,
  value,
  selectedId,
  options,
  placeholder,
  emptyMessage,
  onChange,
  onSelect,
}: {
  id: string;
  label: string;
  value: string;
  selectedId: string;
  options: ComboOption[];
  placeholder: string;
  emptyMessage: string;
  onChange: (value: string) => void;
  onSelect: (option: ComboOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = `${id}-options`;
  const activeOption = open ? options[activeIndex] : undefined;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const wasOpen = open;
      setOpen(true);
      setActiveIndex((index) => options.length ? (wasOpen ? (index + 1) % options.length : 0) : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const wasOpen = open;
      setOpen(true);
      setActiveIndex((index) => options.length ? (wasOpen ? (index - 1 + options.length) % options.length : options.length - 1) : 0);
    } else if (event.key === "Enter" && open && activeOption) {
      event.preventDefault();
      onSelect(activeOption);
      setOpen(false);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label className={labelClass} htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeOption ? `${listId}-${activeOption.id}` : undefined}
        aria-required="true"
        autoComplete="off"
        value={value}
        onFocus={() => {
          setOpen(true);
          const selectedIndex = options.findIndex((option) => option.id === selectedId);
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
        }}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={handleKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={inputClass}
      />
      <div id={listId} role="listbox" aria-label={label} hidden={!open} className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-rose-100 bg-white p-1 shadow-soft">
        {options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted">{emptyMessage}</p>
        ) : options.map((option, index) => (
          <button
            key={option.id}
            id={`${listId}-${option.id}`}
            type="button"
            role="option"
            aria-selected={option.id === selectedId}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => { onSelect(option); setOpen(false); }}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${index === activeIndex ? "bg-rose-50 text-rose-800" : "text-ink"}`}
          >
            <span className="block">{option.label}</span>
            {option.description && <span className="mt-0.5 block text-xs text-muted">{option.description}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [patientQuery, setPatientQuery] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientError, setNewPatientError] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [newServiceDuration, setNewServiceDuration] = useState("60");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceError, setNewServiceError] = useState("");
  const [creatingService, setCreatingService] = useState(false);

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
        if (initialService) {
          setServiceQuery(text(initialService, "nome"));
          setDuration(text(initialService, "duracao_min") || "60");
        }
        const initialPatient = loaded.patients.find((patient) => text(patient, "id") === initialPatientId);
        if (initialPatient) {
          setPatientQuery(text(initialPatient, "nome"));
        }
        const appointment = loaded.appointment;
        if (appointment) {
          setPatientId(text(appointment, "paciente_id"));
          setServiceId(text(appointment, "servico_id"));
          setPackageId(text(appointment, "pacote_id"));
          const appointmentService = loaded.services.find((service) => text(service, "id") === text(appointment, "servico_id"));
          const appointmentPatient = loaded.patients.find((patient) => text(patient, "id") === text(appointment, "paciente_id"));
          if (appointmentService) setServiceQuery(text(appointmentService, "nome"));
          if (appointmentPatient) setPatientQuery(text(appointmentPatient, "nome"));
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
  }, [appointmentId, initialPatientId, initialServiceId, initialPackageId]);

  const selectedService = data?.services.find((service) => text(service, "id") === serviceId);
  const eligiblePackages = useMemo(() => (data?.packages ?? []).filter((pack) =>
    text(pack, "paciente_id") === patientId && text(pack, "servico_id") === serviceId &&
    text(pack, "status") === "ativo" && Number(pack.sessoes_usadas) < Number(pack.total_sessoes) &&
    (!text(pack, "validade") || text(pack, "validade") >= date),
  ), [data, patientId, serviceId, date]);
  const filteredPatients = (data?.patients ?? []).filter((patient) =>
    normalizeSearch(text(patient, "nome")).includes(normalizeSearch(patientQuery.trim())) ||
    (() => {
      const digits = patientQuery.replace(/\D/g, "");
      const phoneQuery = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
      return phoneQuery.length > 0 && text(patient, "whatsapp").replace(/\D/g, "").includes(phoneQuery);
    })(),
  );
  const filteredServices = (data?.services ?? []).filter((service) =>
    normalizeSearch(text(service, "nome")).includes(normalizeSearch(serviceQuery.trim())),
  );
  const hasExactService = (data?.services ?? []).some((service) =>
    normalizarNomeServico(text(service, "nome")) === normalizarNomeServico(serviceQuery),
  );
  const patientOptions = filteredPatients.map((patient) => ({
    id: text(patient, "id"),
    label: text(patient, "nome") || "Paciente",
    description: text(patient, "whatsapp"),
  }));
  const serviceOptions = filteredServices.map((service) => ({
    id: text(service, "id"),
    label: text(service, "nome") || "Serviço",
    description: `${text(service, "duracao_min") || "60"} min`,
  }));

  async function createPatientInline() {
    setCreatingPatient(true);
    setNewPatientError("");
    try {
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
        setPatientQuery(newPatient.nome);
        setShowNewPatient(false);
        setNewPatientName("");
        setNewPatientPhone("");
      }
    } catch {
      setNewPatientError("Não foi possível cadastrar a paciente. Tente novamente.");
    } finally {
      setCreatingPatient(false);
    }
  }

  async function createServiceInline() {
    setNewServiceError("");
    const serviceName = serviceQuery.trim();
    const serviceDuration = Number(newServiceDuration);
    const servicePrice = newServicePrice.trim() === "" ? null : Number(newServicePrice);
    if (serviceName.length < 2) {
      setNewServiceError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (serviceName.length > 100) {
      setNewServiceError("O nome deve ter até 100 caracteres.");
      return;
    }
    if (!Number.isInteger(serviceDuration) || serviceDuration < 5 || serviceDuration > 720) {
      setNewServiceError("Informe uma duração entre 5 e 720 minutos.");
      return;
    }
    if (servicePrice !== null && (!Number.isFinite(servicePrice) || servicePrice < 0)) {
      setNewServiceError("Informe um preço válido, igual ou maior que zero.");
      return;
    }
    setCreatingService(true);
    try {
      const result = await saveServiceAction({
        nome: serviceName,
        duracao_min: serviceDuration,
        preco: servicePrice,
      });
      if ("error" in result) {
        setNewServiceError(result.error);
      } else if ("service" in result) {
        const service = result.service;
        const serviceRow: Row = {
          id: service.id,
          nome: service.nome,
          duracao_min: service.duracao_min,
          preco: service.preco,
        };
        setData((current) => current ? {
          ...current,
          services: current.services.some((item) => text(item, "id") === service.id)
            ? current.services.map((item) => text(item, "id") === service.id ? serviceRow : item)
            : [...current.services, serviceRow],
        } : current);
        setServiceId(service.id);
        setServiceQuery(service.nome);
        setPackageId("");
        setDuration(String(service.duracao_min || 60));
        setShowNewService(false);
        setNewServicePrice("");
        setNewServiceDuration(String(service.duracao_min || 60));
      } else {
        setNewServiceError(result.success);
      }
    } catch {
      setNewServiceError("Não foi possível cadastrar o serviço. Tente novamente.");
    }
    setCreatingService(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) {
      setError("Selecione uma paciente na lista.");
      return;
    }
    if (!serviceId) {
      setError("Selecione um serviço na lista.");
      return;
    }
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
        {!data.temAcesso && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Disponível ao ativar o plano</p>}
        {appointmentId && <input type="hidden" name="id" value={appointmentId} />}
        <fieldset disabled={!data.temAcesso} className="space-y-5 disabled:opacity-60">
        <Panel title="Atendimento">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <input type="hidden" name="paciente_id" value={patientId} />
              <SearchCombobox
                id="patient-search"
                label="Paciente *"
                value={patientQuery}
                selectedId={patientId}
                options={patientOptions}
                placeholder="Buscar por nome ou WhatsApp"
                emptyMessage="Nenhuma paciente encontrada."
                onChange={(value) => { setPatientQuery(value); setPatientId(""); setPackageId(""); }}
                onSelect={(option) => {
                  setPatientId(option.id);
                  setPatientQuery(option.label);
                  setPackageId("");
                }}
              />
              <button type="button" aria-disabled={!data.temAcesso} title={!data.temAcesso ? "Disponível ao ativar o plano" : undefined} onClick={() => setShowNewPatient(!showNewPatient)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><Plus size={14} /> Cadastrar paciente sem sair</button>
              {showNewPatient && <div className="mt-3 grid gap-3 rounded-xl border border-rose-100 p-3 sm:grid-cols-[1fr_1fr_auto]">
                <input value={newPatientName} onChange={(event) => setNewPatientName(event.target.value)} placeholder="Nome completo" className={inputClass} />
                <input value={newPatientPhone} onChange={(event) => setNewPatientPhone(event.target.value)} placeholder="WhatsApp com DDD" className={inputClass} />
                <button type="button" disabled={creatingPatient} onClick={() => void createPatientInline()} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{creatingPatient ? "Salvando..." : "Cadastrar"}</button>
                {newPatientError && <p role="alert" className="text-xs text-red-700 sm:col-span-3">{newPatientError}</p>}
              </div>}
            </div>
            <div>
              <input type="hidden" name="servico_id" value={serviceId} />
              <SearchCombobox
                id="service-search"
                label="Serviço *"
                value={serviceQuery}
                selectedId={serviceId}
                options={serviceOptions}
                placeholder="Buscar serviço"
                emptyMessage="Nenhum serviço encontrado."
                onChange={(value) => {
                  setServiceQuery(value);
                  setServiceId("");
                  setPackageId("");
                  setShowNewService(false);
                  setNewServiceError("");
                }}
                onSelect={(option) => {
                  const service = data.services.find((item) => text(item, "id") === option.id);
                  setServiceId(option.id);
                  setServiceQuery(option.label);
                  setPackageId("");
                  setDuration(text(service ?? {}, "duracao_min") || "60");
                }}
              />
              {serviceQuery.trim() && !hasExactService && data.role === "dona" && (
                <button type="button" aria-disabled={!data.temAcesso} title={!data.temAcesso ? "Disponível ao ativar o plano" : undefined} onClick={() => { setShowNewService(true); setNewServiceError(""); }} className="mt-2 text-left text-xs font-semibold text-rose-700 hover:text-rose-800">
                  + Cadastrar “{serviceQuery.trim()}” como novo serviço
                </button>
              )}
              {serviceQuery.trim() && !hasExactService && data.role !== "dona" && (
                <p className="mt-2 text-xs text-muted">Serviço não encontrado. Peça à dona da clínica para cadastrá-lo.</p>
              )}
              {showNewService && (
                <div className="mt-3 space-y-3 rounded-xl border border-rose-100 bg-white p-3">
                  <p className="text-sm font-semibold">Novo serviço</p>
                  <label className="block"><span className={labelClass}>Nome</span><input required minLength={2} maxLength={100} value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} className={inputClass} /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className={labelClass}>Duração (minutos) *</span><input required type="number" min="5" max="720" value={newServiceDuration} onChange={(event) => setNewServiceDuration(event.target.value)} className={inputClass} /></label>
                    <label className="block"><span className={labelClass}>Preço (opcional)</span><input type="number" min="0" step="0.01" value={newServicePrice} onChange={(event) => setNewServicePrice(event.target.value)} className={inputClass} /></label>
                  </div>
                  {newServiceError && <p role="alert" className="text-xs text-red-700">{newServiceError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button disabled={creatingService} type="button" onClick={() => void createServiceInline()} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{creatingService ? "Salvando..." : "Cadastrar serviço"}</button>
                    <button disabled={creatingService} type="button" onClick={() => setShowNewService(false)} className="rounded-xl border border-rose-100 px-3 py-2 text-xs font-semibold text-muted">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label><span className={labelClass}>Pacote (opcional)</span><select name="pacote_id" value={packageId} onChange={(event) => setPackageId(event.target.value)} className={inputClass}><option value="">Sem pacote</option>{eligiblePackages.map((pack) => <option key={text(pack, "id")} value={text(pack, "id")}>{text(pack, "nome")} · {Number(pack.total_sessoes) - Number(pack.sessoes_usadas)} sessões restantes</option>)}</select></label>
              {patientId && serviceId && eligiblePackages.length === 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted">Sem pacotes ativos para este paciente neste serviço</p>
                  <Link href={`/pacotes/novo?paciente_id=${encodeURIComponent(patientId)}&servico_id=${encodeURIComponent(serviceId)}`} aria-disabled={!data.temAcesso} tabIndex={data.temAcesso ? undefined : -1} onClick={(event) => { if (!data.temAcesso) event.preventDefault(); }} title={!data.temAcesso ? "Disponível ao ativar o plano" : undefined} className={`inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-800 ${!data.temAcesso ? "cursor-not-allowed opacity-50" : ""}`}>
                    <Plus size={13} /> Novo pacote para este paciente
                  </Link>
                </div>
              )}
            </div>
            <label><span className={labelClass}>Data *</span><input required name="data" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Hora *</span><input required name="hora" type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></label>
            <label><span className={labelClass}>Duração (minutos) *</span><input required name="duracao_minutos" type="number" min="5" max="720" value={duration} onChange={(event) => setDuration(event.target.value)} className={inputClass} /><span className="mt-1 block text-[11px] text-muted">Preenchida pela duração do serviço{selectedService ? ` (${text(selectedService, "duracao_min")} min)` : ""}; você pode ajustar.</span></label>
            <label><span className={labelClass}>Profissional/atendente</span><select name="profissional_id" value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className={inputClass}><option value="">Sem profissional definido</option>{data.members.map((member) => <option key={text(member, "user_id")} value={text(member, "user_id")}>{text(member, "nome") || "Membro"} · {text(member, "role") === "dona" ? "Dona" : "Atendente"}</option>)}</select></label>
            <label className="md:col-span-2"><span className={labelClass}>Observações</span><textarea name="observacoes" rows={3} defaultValue={text(data.appointment ?? {}, "observacoes")} className={inputClass} /></label>
          </div>
        </Panel>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end"><button disabled={saving || !data.temAcesso} aria-disabled={!data.temAcesso} title={!data.temAcesso ? "Disponível ao ativar o plano" : undefined} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><Save size={16} />{saving ? "Salvando..." : "Salvar agendamento"}</button></div>
        </fieldset>
      </form>
    </>
  );
}