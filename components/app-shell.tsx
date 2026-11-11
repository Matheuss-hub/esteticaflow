"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Flower2,
  LifeBuoy,
  LayoutDashboard,
  Package,
  Scissors,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAuthContextAction } from "@/app/actions/auth";
import { UserMenu } from "@/components/user-menu";
import { Tour } from "@/components/tour/tour";
import { primeiroNome } from "@/lib/nomes";
import { linkWhatsAppSuporte } from "@/lib/suporte";

const navigation = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  { href: "/pacotes", label: "Pacotes", icon: Package },
  { href: "/equipe", label: "Equipe", icon: UserRoundCog },
  { href: "/suporte", label: "Suporte", icon: LifeBuoy },
];

type ClinicContext = {
  userNome: string;
  fotoUrl: string | null;
  role: string;
  clinicaNome: string;
  clinicaId: string;
  clinicaLogoUrl: string | null;
  clinicas: { clinicaId: string; clinicaNome: string }[];
  assinatura: { status: "trial" | "ativa" | "suspensa"; trialInicio: string; trialFim: string; diasRestantes: number; temAcesso: boolean };
  tourConcluido: boolean;
  checklistOculto: boolean;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [context, setContext] = useState<ClinicContext | null>(null);

  const refreshContext = useCallback(async () => {
    const result = await getAuthContextAction();
    setContext(result);
  }, []);

  useEffect(() => {
    void refreshContext();
    window.addEventListener("clinic-context-updated", refreshContext);
    return () => window.removeEventListener("clinic-context-updated", refreshContext);
  }, [pathname, refreshContext]);

  const isPublicPage = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha", "/onboarding", "/trocar-senha"].includes(pathname);
  if (isPublicPage) return <>{children}</>;

  const greetingName = primeiroNome(context?.userNome) || primeiroNome(context?.clinicaNome);
  const expired = context && !context.assinatura.temAcesso;
  const trial = context?.assinatura.status === "trial" && context.assinatura.temAcesso;
  const endDate = context?.assinatura.trialFim
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(context.assinatura.trialFim))
    : "";
  const supportWhatsApp = context
    ? linkWhatsAppSuporte(`Olá! Meu teste grátis do EsteticaFlow terminou e quero ativar o plano. Clínica: ${context.clinicaNome}.`)
    : "";

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <aside className="hidden w-[252px] shrink-0 border-r border-rose-100 bg-white px-5 py-7 lg:flex lg:flex-col">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <Flower2 size={22} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block font-display text-xl font-semibold tracking-tight">EsteticaFlow</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted">gestão com cuidado</span>
          </span>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Menu principal</p>
        <nav className="space-y-1">
          {navigation.filter(({ href }) => href !== "/equipe" || context?.role === "dona").map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                data-tour={href === "/agenda" ? "agenda" : href === "/servicos" ? "servicos" : href === "/pacientes" ? "pacientes" : href === "/pacotes" ? "pacotes" : href === "/equipe" ? "equipe" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-rose-100 text-rose-700"
                    : "text-muted hover:bg-rose-50 hover:text-ink"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-rose-50 p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-500">
            <Flower2 size={18} />
          </div>
          <p className="text-sm font-semibold">Um cuidado de cada vez</p>
          <p className="mt-1 text-xs leading-5 text-muted">Sua rotina mais leve, sua clínica sempre por perto.</p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-rose-100 bg-white/90 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <Flower2 size={21} className="text-rose-500" />
              <span className="font-display text-lg font-semibold">EsteticaFlow</span>
            </Link>
            <nav aria-label="Navegação principal" className="flex max-w-[34vw] items-center gap-1 overflow-x-auto lg:hidden">
              {navigation.filter(({ href }) => href !== "/equipe" || context?.role === "dona").map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  data-tour={href === "/agenda" ? "agenda" : href === "/servicos" ? "servicos" : href === "/pacientes" ? "pacientes" : href === "/pacotes" ? "pacotes" : href === "/equipe" ? "equipe" : undefined}
                  aria-label={label}
                  className={`shrink-0 rounded-xl p-2 ${
                    pathname === href ? "bg-rose-100 text-rose-700" : "text-muted"
                  }`}
                >
                  <Icon size={19} />
                </Link>
              ))}
            </nav>
            <div className="hidden text-sm text-muted lg:block">
              {greetingName ? `Olá, ${greetingName} 🌷` : "Olá! 🌷"}
            </div>
            {context && <UserMenu context={context} />}
          </div>
        </header>
        {context && trial && (
          <div className={`border-b px-4 py-2.5 text-sm md:px-8 lg:px-10 ${context.assinatura.diasRestantes <= 2 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-rose-100 bg-white text-ink"}`}>
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
              <p>{context.role === "dona"
                ? `Teste grátis: faltam ${context.assinatura.diasRestantes} ${context.assinatura.diasRestantes === 1 ? "dia" : "dias"} (termina em ${endDate}).`
                : `O teste grátis da clínica termina em ${context.assinatura.diasRestantes} ${context.assinatura.diasRestantes === 1 ? "dia" : "dias"}. Avise a responsável.`}</p>
              {context.role === "dona" && <Link href="/assinatura" className="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">Ver plano</Link>}
            </div>
          </div>
        )}
        {context && expired && (
          <div className="border-b border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-900 md:px-8 lg:px-10">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
              <p>{context.role === "dona"
                ? "Seu teste grátis terminou. Você ainda pode consultar seus dados, mas não é possível criar nem editar até ativar o plano."
                : "Fale com a responsável pela clínica."}</p>
              {context.role === "dona" && <a href={supportWhatsApp} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">Falar no WhatsApp para ativar</a>}
            </div>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 pb-10 md:px-8 md:py-9 lg:px-10">
          {children}
        </main>
      </div>
      {context && <Tour context={context} />}
    </div>
  );
}
