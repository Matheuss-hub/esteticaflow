"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Flower2,
  LayoutDashboard,
  LogOut,
  Package,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthContextAction, signOutAction, switchClinicAction } from "@/app/actions/auth";

const navigation = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: UsersRound },
  { href: "/pacotes", label: "Pacotes", icon: Package },
  { href: "/equipe", label: "Equipe", icon: UserRoundCog },
];

type ClinicContext = {
  userNome: string;
  role: string;
  clinicaNome: string;
  clinicaId: string;
  clinicas: { clinicaId: string; clinicaNome: string }[];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [context, setContext] = useState<ClinicContext | null>(null);

  useEffect(() => {
    void getAuthContextAction().then((result) => setContext(result));
  }, [pathname]);

  const isPublicPage = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha", "/onboarding"].includes(pathname);
  if (isPublicPage) return <>{children}</>;

  async function changeClinic(clinicId: string) {
    const formData = new FormData();
    formData.set("clinica_id", clinicId);
    const result = await switchClinicAction(formData);
    if (result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
    }
  }

  async function signOut() {
    const result = await signOutAction();
    if (result.redirectTo) router.push(result.redirectTo);
  }

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
            <nav className="flex items-center gap-1 lg:hidden">
              {navigation.filter(({ href }) => href !== "/equipe" || context?.role === "dona").map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={`rounded-xl p-2 ${
                    pathname === href ? "bg-rose-100 text-rose-700" : "text-muted"
                  }`}
                >
                  <Icon size={19} />
                </Link>
              ))}
            </nav>
            <div className="hidden text-sm text-muted lg:block">
              {context ? `Olá, ${context.userNome}` : "Olá"} <span className="ml-1">🌷</span>
            </div>
            <div className="flex items-center gap-2">
              {context && context.clinicas.length > 1 ? (
                <select
                  aria-label="Trocar clínica"
                  value={context.clinicaId}
                  onChange={(event) => void changeClinic(event.target.value)}
                  className="max-w-[155px] rounded-xl border border-rose-100 bg-white px-2.5 py-2 text-xs font-semibold text-ink sm:max-w-[220px]"
                >
                  {context.clinicas.map((clinic) => <option key={clinic.clinicaId} value={clinic.clinicaId}>{clinic.clinicaNome}</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-rose-100 bg-white p-1.5 pr-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700">{context?.userNome.slice(0, 2).toUpperCase() ?? "EF"}</span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[150px] truncate text-xs font-semibold">{context?.clinicaNome ?? "EsteticaFlow"}</span>
                    <span className="block text-[10px] capitalize text-muted">{context?.role === "dona" ? "Dona" : context ? "Atendente" : ""}</span>
                  </span>
                  <ChevronDown size={14} className="text-muted" />
                </div>
              )}
              <span className="hidden text-left sm:block">
                {context && context.clinicas.length > 1 && <span className="block text-[10px] text-muted">{context.role === "dona" ? "Dona" : "Atendente"}</span>}
              </span>
              <button type="button" onClick={() => void signOut()} title="Sair" aria-label="Sair" className="rounded-lg border border-rose-100 p-2 text-muted transition hover:bg-rose-50 hover:text-rose-700"><LogOut size={17} /></button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-7 pb-10 md:px-8 md:py-9 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
