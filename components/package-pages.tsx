"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, MessageCircle, PackagePlus, Pencil, Save, XCircle } from "lucide-react";
import { cancelPackageAction, loadPackageDetailAction, loadPackagesPageData, savePackageAction } from "@/app/actions/clinic-data";
import { EmptyState, ErrorNotice, PageHeading, Panel } from "@/components/ui";
import { appointmentDate, dateKey, formatDate, formatTime, numeric, Row, statusLabel, text, whatsappLink } from "@/lib/data";
import { mensagemPacote } from "@/lib/mensagens";

const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-xs font-medium text-ink";
type PackageLists = { patients: Row[]; services: Row[] };
type PackageDetail = { pack: Row; appointments: Row[]; patients: Row[]; services: Row[]; role: string };

export function PackageForm({ packageId, initialPatientId = "" }: { packageId?: string; initialPatientId?: string }) {
  const router = useRouter();
  const [lists, setLists] = useState<PackageLists | null>(null);
  const [pack, setPack] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patientId, setPatientId] = useState(initialPatientId);
  const [serviceId, setServiceId] = useState("");
  const [total, setTotal] = useState("10");
  const [used, setUsed] = useState("0");

  useEffect(() => {
    const request = packageId ? loadPackageDetailAction(packageId) : loadPackagesPageData();
    request.then((result) => {
      if ("error" in result) setLoadError(result.error ?? "Não foi possível carregar o formulário.");
      else if (packageId) {
        const detail = result as PackageDetail;
        setPack(detail.pack);
        setLists({ patients: detail.patients, services: detail.services });
        setPatientId(text(detail.pack, "paciente_id"));
        setServiceId(text(detail.pack, "servico_id"));
        setTotal(text(detail.pack, "total_sessoes") || "1");
        setUsed(text(detail.pack, "sessoes_usadas") || "0");
      } else {
        const pageData = result as { patients: Row[]; services: Row[] };
        setLists({ patients: pageData.patients, services: pageData.services });
      }
      setLoading(false);
    }).catch(() => {
      setLoadError("Não foi possível carregar o formulário.");
      setLoading(false);
    });
  }, [packageId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await savePackageAction(new FormData(event.currentTarget));
    if ("error" in result) {
      setError(result.error ?? "Não foi possível salvar o pacote.");
      setSaving(false);
      return;
    }
    router.push(`/pacotes/${result.id}`);
    router.refresh();
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted">Carregando dados do pacote...</p>;
  if (loadError || !lists) return <ErrorNotice message={loadError || "Não foi possível carregar o formulário."} />;

  return <>
    <PageHeading eyebrow="Planos de cuidado" title={packageId ? "Editar pacote" : "Novo pacote"} description="Registre as sessões, condições e pagamento do plano."
      action={<Link href="/pacotes" className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 py-2.5 text-sm font-semibold"><ArrowLeft size={16} /> Voltar</Link>} />
    <form onSubmit={submit} className="space-y-5">
      {packageId && <input type="hidden" name="id" value={packageId} />}
      <Panel title="Dados do pacote">
        <div className="grid gap-4 md:grid-cols-2">
          <label><span className={labelClass}>Paciente *</span><select required name="paciente_id" value={patientId} onChange={(event) => setPatientId(event.target.value)} className={inputClass}><option value="">Selecione</option>{lists.patients.map((patient) => <option key={text(patient, "id")} value={text(patient, "id")}>{text(patient, "nome")}</option>)}</select></label>
          <label><span className={labelClass}>Serviço *</span><select required name="servico_id" value={serviceId} onChange={(event) => setServiceId(event.target.value)} className={inputClass}><option value="">Selecione</option>{lists.services.map((service) => <option key={text(service, "id")} value={text(service, "id")}>{text(service, "nome")}</option>)}</select></label>
          <label><span className={labelClass}>Nome do pacote *</span><input required name="nome" defaultValue={text(pack ?? {}, "nome")} placeholder="Ex.: Plano de limpeza facial" className={inputClass} /></label>
          <label><span className={labelClass}>Total de sessões *</span><input required name="total_sessoes" type="number" min="1" value={total} onChange={(event) => setTotal(event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>Sessões já realizadas</span><input required name="sessoes_usadas" type="number" min="0" max={total} value={used} onChange={(event) => setUsed(event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>Valor total (R$)</span><input required name="valor_total" type="number" min="0" step="0.01" defaultValue={text(pack ?? {}, "valor_total") || "0.00"} className={inputClass} /></label>
          <label><span className={labelClass}>Forma de pagamento *</span><select required name="forma_pagamento" defaultValue={text(pack ?? {}, "forma_pagamento") || "pix"} className={inputClass}><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="parcelado">Parcelado</option></select></label>
          <label><span className={labelClass}>Data de início *</span><input required name="data_inicio" type="date" defaultValue={text(pack ?? {}, "data_inicio").slice(0, 10) || dateKey(new Date())} className={inputClass} /></label>
          <label><span className={labelClass}>Validade (opcional)</span><input name="validade" type="date" defaultValue={text(pack ?? {}, "validade").slice(0, 10)} className={inputClass} /></label>
          <label className="md:col-span-2"><span className={labelClass}>Observações</span><textarea name="observacoes" rows={3} defaultValue={text(pack ?? {}, "observacoes")} className={inputClass} /></label>
        </div>
      </Panel>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="flex justify-end"><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><Save size={16} />{saving ? "Salvando..." : "Salvar pacote"}</button></div>
    </form>
  </>;
}

export function PackagesPage() {
  const [packages, setPackages] = useState<Row[]>([]);
  const [patients, setPatients] = useState<Row[]>([]);
  const [services, setServices] = useState<Row[]>([]);
  const [filter, setFilter] = useState("ativos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPackagesPageData().then((result) => {
      if ("error" in result) setError(result.error ?? "Não foi possível carregar os pacotes.");
      else {
        setPackages(result.packages as Row[]);
        setPatients(result.patients as Row[]);
        setServices(result.services as Row[]);
      }
      setLoading(false);
    }).catch(() => {
      setError("Não foi possível carregar os pacotes.");
      setLoading(false);
    });
  }, []);

  const patientsById = useMemo(() => new Map(patients.map((patient) => [text(patient, "id"), patient])), [patients]);
  const servicesById = useMemo(() => new Map(services.map((service) => [text(service, "id"), text(service, "nome")])), [services]);
  const visiblePackages = packages.filter((pack) => {
    const status = text(pack, "status") || "ativo";
    const remaining = numeric(pack, "total_sessoes") - numeric(pack, "sessoes_usadas");
    const expired = Boolean(text(pack, "validade")) && text(pack, "validade") < dateKey(new Date());
    const matchesFilter = filter === "todos" ||
      (filter === "ativos" && status === "ativo" && !expired) ||
      (filter === "acabando" && status === "ativo" && remaining > 0 && remaining <= 2 && !expired) ||
      (filter === "concluidos" && status === "concluido") ||
      (filter === "vencidos" && status === "ativo" && expired);
    const patientName = text(patientsById.get(text(pack, "paciente_id")) ?? {}, "nome").toLocaleLowerCase("pt-BR");
    return matchesFilter && patientName.includes(search.trim().toLocaleLowerCase("pt-BR"));
  });

  return <>
    <PageHeading eyebrow="Cuidado contínuo" title="Pacotes" description="Acompanhe sessões, validade e renovação dos planos."
      action={<Link href="/pacotes/novo" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"><PackagePlus size={16} /> Novo pacote</Link>} />
    {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
    <Panel title="Planos cadastrados" subtitle={`${visiblePackages.length} ${visiblePackages.length === 1 ? "pacote" : "pacotes"}`}>
      <div className="mb-5 flex flex-wrap gap-3">
        <label><span className="sr-only">Filtrar pacotes</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm"><option value="ativos">Ativos</option><option value="acabando">Acabando</option><option value="concluidos">Concluídos</option><option value="vencidos">Vencidos</option><option value="todos">Todos</option></select></label>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente" aria-label="Buscar por paciente" className="min-w-[220px] flex-1 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm" />
      </div>
      {loading ? <p className="py-8 text-center text-sm text-muted">Carregando pacotes...</p> : visiblePackages.length === 0 ? <EmptyState>Nenhum pacote encontrado para este filtro.</EmptyState> : <div className="space-y-3">
        {visiblePackages.map((pack) => {
          const patient = patientsById.get(text(pack, "paciente_id"));
          const total = numeric(pack, "total_sessoes");
          const used = numeric(pack, "sessoes_usadas");
          const remaining = Math.max(total - used, 0);
          const status = text(pack, "status") || "ativo";
          const expired = Boolean(text(pack, "validade")) && text(pack, "validade") < dateKey(new Date());
          return <Link key={text(pack, "id")} href={`/pacotes/${text(pack, "id")}`} className="block rounded-xl border border-rose-100 p-4 transition hover:bg-rose-50/40">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{text(pack, "nome") || "Pacote"}</p><p className="mt-1 text-xs text-muted">{text(patient ?? {}, "nome")} · {servicesById.get(text(pack, "servico_id")) || "Serviço"}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700">{expired ? "Vencido" : statusLabel(status)}</span>{status === "ativo" && remaining > 0 && remaining <= 2 && !expired && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Acabando</span>}</div></div>
            <div className="mt-3 flex items-center justify-between text-xs"><span>{used}/{total} sessões</span><span className="font-semibold text-rose-700">{remaining} restantes</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-rose-50"><div className={`h-full rounded-full ${remaining <= 2 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${total ? Math.min(used / total * 100, 100) : 0}%` }} /></div>
          </Link>;
        })}
      </div>}
    </Panel>
  </>;
}

export function PackageDetailPage({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    loadPackageDetailAction(packageId).then((result) => {
      if ("error" in result) setError(result.error ?? "Não foi possível carregar o pacote.");
      else setData(result as PackageDetail);
      setLoading(false);
    }).catch(() => {
      setError("Não foi possível carregar o pacote.");
      setLoading(false);
    });
  }, [packageId]);

  async function cancel() {
    if (!window.confirm("Deseja cancelar este pacote? O histórico será mantido.")) return;
    setSaving(true);
    setCancelError("");
    const formData = new FormData();
    formData.set("id", packageId);
    const result = await cancelPackageAction(formData);
    if ("error" in result) {
      setCancelError(result.error ?? "Não foi possível cancelar o pacote.");
      setSaving(false);
    } else {
      router.refresh();
      window.location.reload();
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted">Carregando pacote...</p>;
  if (error || !data) return <ErrorNotice message={error || "Pacote não encontrado."} />;
  const { pack, appointments, patients, services, role } = data;
  const patient = patients.find((item) => text(item, "id") === text(pack, "paciente_id"));
  const serviceName = services.find((item) => text(item, "id") === text(pack, "servico_id"));
  const total = numeric(pack, "total_sessoes");
  const used = numeric(pack, "sessoes_usadas");
  const remaining = Math.max(total - used, 0);
  const status = text(pack, "status") || "ativo";
  const completedSessions = appointments.filter((item) => text(item, "status") === "realizado");
  const nextAppointments = appointments.filter((item) => appointmentDate(item)?.getTime() !== undefined && (appointmentDate(item)?.getTime() ?? 0) >= Date.now() && !["cancelado", "faltou", "realizado"].includes(text(item, "status")));
  const phone = text(patient ?? {}, "whatsapp");

  return <>
    <PageHeading eyebrow="Plano de cuidado" title={text(pack, "nome") || "Pacote"} description={`${text(patient ?? {}, "nome")} · ${text(serviceName ?? {}, "nome")}`}
      action={<div className="flex flex-wrap gap-2">
        <Link href="/pacotes" className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm font-semibold"><ArrowLeft size={16} /> Voltar</Link>
        <Link href={`/pacotes/${packageId}/editar`} className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-sm font-semibold"><Pencil size={15} /> Editar</Link>
        {status === "ativo" && <Link href={`/agenda/novo?paciente_id=${text(pack, "paciente_id")}&servico_id=${text(pack, "servico_id")}&pacote_id=${packageId}`} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white"><CalendarPlus size={16} /> Agendar próxima sessão</Link>}
        {phone && <a href={whatsappLink(phone, mensagemPacote(text(patient ?? {}, "nome"), text(pack, "nome"), remaining))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white"><MessageCircle size={16} /> Enviar no Zap</a>}
        {role === "dona" && status === "ativo" && <button type="button" disabled={saving} onClick={() => void cancel()} title="Cancelar pacote" className="rounded-xl border border-red-200 bg-white p-2.5 text-red-700 disabled:opacity-50"><XCircle size={17} /></button>}
      </div>} />
    {cancelError && <p role="alert" className="mb-4 text-sm text-red-700">{cancelError}</p>}
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Progresso" subtitle={`${statusLabel(status)} · ${remaining} sessões restantes`}>
        <div className="flex items-end justify-between"><span className="font-display text-4xl font-semibold">{used}<span className="text-lg text-muted">/{total}</span></span><span className="text-sm font-semibold text-rose-700">{total ? Math.round(used / total * 100) : 0}%</span></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-rose-50"><div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${total ? Math.min(used / total * 100, 100) : 0}%` }} /></div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted">Valor total</dt><dd className="mt-1 font-semibold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric(pack, "valor_total"))}</dd></div><div><dt className="text-xs text-muted">Pagamento</dt><dd className="mt-1 font-semibold">{text(pack, "forma_pagamento") || "Não informado"}</dd></div><div><dt className="text-xs text-muted">Início</dt><dd className="mt-1 font-semibold">{formatDate(text(pack, "data_inicio") ? new Date(`${text(pack, "data_inicio").slice(0, 10)}T12:00:00-03:00`) : null)}</dd></div><div><dt className="text-xs text-muted">Validade</dt><dd className="mt-1 font-semibold">{formatDate(text(pack, "validade") ? new Date(`${text(pack, "validade").slice(0, 10)}T12:00:00-03:00`) : null)}</dd></div></dl>
        {text(pack, "observacoes") && <p className="mt-4 whitespace-pre-wrap border-t border-rose-50 pt-4 text-sm">{text(pack, "observacoes")}</p>}
      </Panel>
      <Panel title="Sessões realizadas" subtitle={`${completedSessions.length} atendimentos vinculados ao pacote`}>
        {completedSessions.length === 0 ? <EmptyState>Nenhuma sessão realizada ainda.</EmptyState> : <div className="divide-y divide-rose-50">{completedSessions.map((item) => <div key={text(item, "id")} className="flex items-center justify-between gap-3 py-3"><span className="text-sm">{formatDate(appointmentDate(item))}</span><span className="text-xs text-muted">{formatTime(item)}</span></div>)}</div>}
      </Panel>
      <Panel title="Próximos agendamentos" subtitle={`${nextAppointments.length} sessões marcadas`}>
        {nextAppointments.length === 0 ? <EmptyState>Nenhum próximo agendamento.</EmptyState> : <div className="divide-y divide-rose-50">{nextAppointments.map((item) => <div key={text(item, "id")} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{formatDate(appointmentDate(item))} · {formatTime(item)}</p><p className="mt-1 text-xs text-muted">{statusLabel(text(item, "status"))}</p></div><Link href={`/agenda/${text(item, "id")}/editar`} className="text-xs font-semibold text-rose-700">Editar</Link></div>)}</div>}
      </Panel>
      <Panel title="Paciente" subtitle="Acesso ao cadastro completo">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{text(patient ?? {}, "nome")}</p><p className="mt-1 text-xs text-muted">{text(patient ?? {}, "whatsapp")}</p></div><Link href={`/pacientes/${text(patient ?? {}, "id")}`} className="text-xs font-semibold text-rose-700">Ver detalhe</Link></div>
      </Panel>
    </div>
  </>;
}