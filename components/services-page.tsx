"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Scissors, Trash2, X } from "lucide-react";
import { deleteServiceAction, loadServicesAction, saveServiceAction } from "@/app/actions/services";
import { EmptyState, ErrorNotice, PageHeading, Panel } from "@/components/ui";
import type { Servico } from "@/lib/servicos";

const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-xs font-medium text-ink";

type ServiceForm = { id: string; nome: string; duracao_min: string; preco: string };

const emptyForm = (): ServiceForm => ({ id: "", nome: "", duracao_min: "60", preco: "" });

export function ServicesPage() {
  const [services, setServices] = useState<Servico[]>([]);
  const [role, setRole] = useState("");
  const [temAcesso, setTemAcesso] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await loadServicesAction();
      if ("error" in result) setError(result.error);
      else {
        setServices(result.services);
        setRole(result.role);
        setTemAcesso(result.temAcesso);
        setError("");
      }
    } catch {
      setError("Não foi possível carregar os serviços. Tente novamente.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");
    try {
      const result = await saveServiceAction({
        ...form,
        duracao_min: Number(form.duracao_min),
      });
      if ("error" in result) {
        setFormError(result.error);
      } else if ("service" in result) {
        setServices((current) => {
          const exists = current.some((service) => service.id === result.service.id);
          return exists
            ? current.map((service) => service.id === result.service.id ? result.service : service)
            : [...current, result.service].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        });
        setNotice(result.existing ? "Já havia um serviço com esse nome; ele foi mantido." : "Serviço cadastrado.");
        setForm(emptyForm());
      } else {
        setNotice(result.success);
        setForm(emptyForm());
        await load();
      }
    } catch {
      setFormError("Não foi possível salvar o serviço. Tente novamente.");
    }
    setSaving(false);
  }

  async function remove(service: Servico) {
    if (!window.confirm(`Excluir o serviço “${service.nome}”?`)) return;
    setFormError("");
    setNotice("");
    try {
      const result = await deleteServiceAction(service.id);
      if ("error" in result) setFormError(result.error);
      else {
        setServices((current) => current.filter((item) => item.id !== service.id));
        setNotice(result.success);
        if (form.id === service.id) setForm(emptyForm());
      }
    } catch {
      setFormError("Não foi possível excluir o serviço. Tente novamente.");
    }
  }

  function edit(service: Servico) {
    setForm({
      id: service.id,
      nome: service.nome,
      duracao_min: String(service.duracao_min),
      preco: service.preco == null ? "" : String(service.preco),
    });
    setFormError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isOwner = role === "dona";

  return (
    <>
      <PageHeading eyebrow="Cuidados oferecidos" title="Serviços" description="Consulte os serviços disponíveis na sua clínica." />
      {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
      {formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        {isOwner && (
          <Panel title={form.id ? "Editar serviço" : "Cadastrar serviço"}>
            {!temAcesso && <p className="mb-4 text-xs text-amber-800">Disponível ao ativar o plano</p>}
            <form onSubmit={submit} className="space-y-4">
              <fieldset disabled={!temAcesso} className="space-y-4 disabled:opacity-60">
              <label className="block">
                <span className={labelClass}>Nome *</span>
                <input required minLength={2} maxLength={100} value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Duração (minutos) *</span>
                <input required type="number" min="5" max="720" step="1" value={form.duracao_min} onChange={(event) => setForm({ ...form, duracao_min: event.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Preço (opcional)</span>
                <input type="number" min="0" step="0.01" value={form.preco} onChange={(event) => setForm({ ...form, preco: event.target.value })} className={inputClass} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button disabled={saving || !temAcesso} aria-disabled={!temAcesso} title={!temAcesso ? "Disponível ao ativar o plano" : undefined} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                  <Plus size={16} /> {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar serviço"}
                </button>
                {form.id && <button type="button" onClick={() => { setForm(emptyForm()); setFormError(""); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-100 px-4 py-3 text-sm font-semibold text-muted"><X size={15} /> Cancelar</button>}
              </div>
              </fieldset>
            </form>
          </Panel>
        )}

        <Panel title="Serviços da clínica" subtitle={`${services.length} ${services.length === 1 ? "serviço" : "serviços"}`} className={isOwner ? "" : "lg:col-span-2"}>
          {loading ? <p className="py-8 text-center text-sm text-muted">Carregando serviços...</p> : services.length === 0 ? (
            <EmptyState>Nenhum serviço cadastrado nesta clínica.</EmptyState>
          ) : (
            <div className="divide-y divide-rose-50">
              {services.map((service) => (
                <article key={service.id} className="flex items-start gap-3 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Scissors size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{service.nome}</p>
                    <p className="mt-1 text-xs text-muted">
                      {service.duracao_min} min
                      {service.preco != null ? ` · ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.preco)}` : ""}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1">
                      <button type="button" disabled={!temAcesso} aria-disabled={!temAcesso} title={!temAcesso ? "Disponível ao ativar o plano" : undefined} onClick={() => edit(service)} aria-label={`Editar ${service.nome}`} className="rounded-lg border border-rose-100 p-2 text-muted hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"><Pencil size={15} /></button>
                      <button type="button" disabled={!temAcesso} aria-disabled={!temAcesso} title={!temAcesso ? "Disponível ao ativar o plano" : undefined} onClick={() => void remove(service)} aria-label={`Excluir ${service.nome}`} className="rounded-lg border border-rose-100 p-2 text-muted hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={15} /></button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
