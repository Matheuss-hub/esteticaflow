"use client";

import {
  CalendarDays,
  Check,
  Flower2,
  LifeBuoy,
  MessageCircle,
  Package,
  Scissors,
  UsersRound,
  UserRound,
  LayoutDashboard,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { atualizarMeuOnboarding } from "@/app/actions/onboarding";

type TourContext = {
  clinicaNome: string;
  userNome: string;
  role: string;
  assinatura: { trialFim: string };
  tourConcluido: boolean;
};

const accessText = "Seu teste grátis de 7 dias começou.";
const dismissibleSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Tour({ context }: { context: TourContext }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const owner = context.role === "dona";
  const endDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(context.assinatura.trialFim));

  const steps = useMemo(() => {
    const base = [
      { icon: Flower2, title: "Boas-vindas", content: `${accessText} Ele termina em ${endDate}. A seguir, você vai conhecer os recursos para organizar sua clínica.` },
      { icon: LayoutDashboard, title: "Visão geral", content: "Acompanhe os agendamentos do dia, a taxa de comparecimento do mês e os pacotes que estão acabando." },
      {
        icon: Scissors,
        title: "Serviços",
        content: owner
          ? "Cadastre o que você oferece: nome, duração e preço. A duração preenche o agendamento automaticamente. Este é o primeiro passo."
          : "Serviços: você consulta a lista; a dona cadastra.",
        target: "servicos",
      },
      { icon: UserRound, title: "Pacientes", content: "Cadastre pacientes com WhatsApp, anamnese e consentimento. A lista “Para reativar” mostra quem está há mais de 60 dias sem visita.", target: "pacientes" },
      { icon: Package, title: "Pacotes", content: "Registre pacotes de sessões, acompanhe a barra de progresso e veja o aviso quando um pacote estiver acabando.", target: "pacotes" },
      { icon: CalendarDays, title: "Agenda", content: "Crie agendamentos, acompanhe os status e evite horários repetidos. Ao marcar como realizado, uma sessão do pacote é descontada.", target: "agenda" },
      { icon: MessageCircle, title: "Enviar no Zap", content: "Use as mensagens prontas de confirmação, reativação e pacote acabando nos botões de WhatsApp disponíveis no sistema." },
      { icon: UsersRound, title: "Equipe", content: "Cadastre funcionárias com uma senha provisória. Elas podem acessar a clínica, mas não editar os dados da clínica.", target: "equipe" },
      {
        icon: LifeBuoy,
        title: owner ? "Perfil, clínica e suporte" : "Perfil e suporte",
        content: owner
          ? "Adicione sua foto e a logo da clínica em seus respectivos dados. Para pedir ajuda, acesse a Central de suporte."
          : "Atualize sua foto e seus dados em Meu perfil. Para pedir ajuda, acesse a Central de suporte.",
      },
    ];
    return owner ? base : base.filter((_, index) => index !== 7);
  }, [endDate, owner]);

  const finish = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const result = await atualizarMeuOnboarding({ tourConcluido: true, checklistOculto: null });
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
      setOpen(false);
    } catch {
      setError("Não foi possível salvar o tutorial. Tente novamente.");
    }
    setSaving(false);
  }, []);

  const closeWithEscape = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!context.tourConcluido) setOpen(true);
    const handleReopen = () => {
      setStep(0);
      setError("");
      setOpen(true);
    };
    window.addEventListener("reopen-tour", handleReopen);
    return () => window.removeEventListener("reopen-tour", handleReopen);
  }, [context.tourConcluido]);

  useEffect(() => {
    const activeTarget = open ? steps[step]?.target : undefined;
    document.querySelectorAll<HTMLElement>(".tour-highlight").forEach((item) => item.classList.remove("tour-highlight"));
    if (activeTarget) {
      document.querySelectorAll<HTMLElement>(`[data-tour="${activeTarget}"]`).forEach((item) => item.classList.add("tour-highlight"));
    }
    return () => document.querySelectorAll<HTMLElement>(".tour-highlight").forEach((item) => item.classList.remove("tour-highlight"));
  }, [open, step, steps]);

  useEffect(() => {
    if (!open) {
      openerRef.current?.focus();
      return;
    }
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(dismissibleSelector)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWithEscape();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(dismissibleSelector));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeWithEscape]);

  if (!open) return null;
  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/35 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpen(false);
    }}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        tabIndex={-1}
        className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-5 shadow-[0_24px_70px_rgba(74,38,44,0.2)] outline-none sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600">
            <Flower2 size={17} aria-hidden="true" /> EsteticaFlow
          </div>
          <p className="text-xs font-medium text-muted" aria-live="polite">Passo {step + 1} de {steps.length}</p>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-rose-50" aria-hidden="true">
          <div className="h-full rounded-full bg-rose-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden="true"><Icon size={24} /></span>
        <h2 id="tour-title" className="font-display text-2xl font-semibold text-ink">{current.title}</h2>
        <p id="tour-description" className="mt-3 min-h-[72px] text-sm leading-6 text-muted">{current.content}</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
          <button type="button" disabled={saving} onClick={() => void finish()} className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 disabled:opacity-60">Pular tutorial</button>
          <div className="flex items-center gap-2">
            <button type="button" disabled={step === 0 || saving} onClick={() => { setError(""); setStep((value) => value - 1); }} className="min-h-11 rounded-xl border border-rose-100 px-4 py-2 text-sm font-semibold text-ink hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 disabled:opacity-50">Voltar</button>
            {step < steps.length - 1 ? (
              <button type="button" disabled={saving} onClick={() => { setError(""); setStep((value) => value + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:opacity-60">Próximo <Check size={16} aria-hidden="true" /></button>
            ) : (
              <button type="button" disabled={saving} onClick={() => void finish()} className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:opacity-60">{saving ? "Salvando..." : "Começar a usar"}</button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
