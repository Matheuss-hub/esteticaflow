"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { savePatientAction } from "@/app/actions/clinic-data";
import { PageHeading, Panel } from "@/components/ui";
import type { Row } from "@/lib/data";
import { text } from "@/lib/data";

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition placeholder:text-muted/70 focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-xs font-medium text-ink";

export function PatientForm({ patient }: { patient?: Row }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [whatsapp, setWhatsapp] = useState(maskPhone(text(patient ?? {}, "whatsapp")));
  const [cpf, setCpf] = useState(maskCpf(text(patient ?? {}, "cpf")));
  const consentDate = text(patient ?? {}, "consentimento_whatsapp_em");
  const editing = Boolean(patient);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const result = await savePatientAction(formData);
    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(`/pacientes/${result.id}`);
    router.refresh();
  }

  return (
    <>
      <PageHeading
        eyebrow="Relacionamento e cuidado"
        title={editing ? "Editar paciente" : "Novo paciente"}
        description="Cadastre os dados necessários para um atendimento seguro e acolhedor."
        action={<button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 py-2.5 text-sm font-semibold text-ink"><ArrowLeft size={16} /> Voltar</button>}
      />
      <form onSubmit={submit} className="space-y-5">
        {patient && <input type="hidden" name="id" value={text(patient, "id")} />}
        <Panel title="Dados pessoais" subtitle="Informações para contato e identificação">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2"><span className={labelClass}>Nome completo *</span><input required name="nome" defaultValue={text(patient ?? {}, "nome")} className={inputClass} autoComplete="name" /></label>
            <label><span className={labelClass}>WhatsApp *</span><input required name="whatsapp" type="tel" inputMode="tel" value={whatsapp} onChange={(event) => setWhatsapp(maskPhone(event.target.value))} placeholder="(11) 99999-9999" className={inputClass} autoComplete="tel" /></label>
            <label><span className={labelClass}>E-mail</span><input name="email" type="email" defaultValue={text(patient ?? {}, "email")} className={inputClass} autoComplete="email" /></label>
            <label><span className={labelClass}>Data de nascimento</span><input name="data_nascimento" type="date" defaultValue={text(patient ?? {}, "data_nascimento").slice(0, 10)} className={inputClass} /></label>
            <label><span className={labelClass}>CPF (opcional)</span><input name="cpf" inputMode="numeric" value={cpf} onChange={(event) => setCpf(maskCpf(event.target.value))} placeholder="000.000.000-00" className={inputClass} /></label>
            <label><span className={labelClass}>Como conheceu a clínica?</span><select name="como_conheceu" defaultValue={text(patient ?? {}, "como_conheceu")} className={inputClass}><option value="">Selecione</option><option value="instagram">Instagram</option><option value="indicacao">Indicação</option><option value="google">Google</option><option value="outro">Outro</option></select></label>
          </div>
        </Panel>

        <Panel title="Anamnese básica" subtitle="Informações de saúde para orientar o atendimento">
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className={labelClass}>Alergias</span><textarea name="alergias" rows={3} defaultValue={text(patient ?? {}, "alergias")} className={inputClass} /></label>
            <label><span className={labelClass}>Medicamentos em uso</span><textarea name="medicamentos_uso" rows={3} defaultValue={text(patient ?? {}, "medicamentos_uso")} className={inputClass} /></label>
            <label><span className={labelClass}>Condições de saúde</span><textarea name="condicoes_saude" rows={3} defaultValue={text(patient ?? {}, "condicoes_saude")} className={inputClass} /></label>
            <label><span className={labelClass}>Observações</span><textarea name="observacoes" rows={3} defaultValue={text(patient ?? {}, "observacoes")} className={inputClass} /></label>
            <label className="flex items-center gap-3 rounded-xl border border-rose-100 px-3.5 py-3 text-sm md:col-span-2">
              <input name="gestante_lactante" type="checkbox" defaultChecked={patient?.gestante_lactante === true} className="h-4 w-4 accent-rose-600" />
              Gestante ou lactante
            </label>
          </div>
        </Panel>

        <Panel title="Consentimento de contato" subtitle="Registre a autorização para mensagens pelo WhatsApp">
          <label className="flex items-start gap-3 text-sm leading-6">
            <input name="consentimento_whatsapp" type="checkbox" defaultChecked={patient?.consentimento_whatsapp === true} className="mt-1 h-4 w-4 accent-rose-600" />
            <span>Autorizo o contato com esta paciente pelo WhatsApp para assuntos relacionados à clínica.</span>
          </label>
          {consentDate && <p className="mt-3 text-xs text-muted">Consentimento registrado em {new Date(consentDate).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p>}
        </Panel>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"><Save size={16} />{saving ? "Salvando..." : "Salvar paciente"}</button>
        </div>
      </form>
    </>
  );
}