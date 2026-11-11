"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Play,
  UserRound,
  Users,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { logoutFromMenuAction, switchClinicAction } from "@/app/actions/auth";
import { AvatarImage } from "@/components/avatar-image";
import { iniciaisNome } from "@/lib/nomes";

type UserMenuContext = {
  clinicaId: string;
  clinicaNome: string;
  clinicaLogoUrl: string | null;
  role: string;
  userNome: string;
  fotoUrl: string | null;
  clinicas: { clinicaId: string; clinicaNome: string }[];
};

export function UserMenu({ context }: { context: UserMenuContext }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const initials = iniciaisNome(context.userNome) || iniciaisNome(context.clinicaNome) || "EF";
  const roleLabel = context.role === "dona" ? "Dona" : "Atendente";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(currentIndex + direction + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  async function changeClinic(clinicId: string) {
    setError("");
    setSwitching(true);
    const formData = new FormData();
    formData.set("clinica_id", clinicId);
    const result = await switchClinicAction(formData);
    setSwitching(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(result.redirectTo ?? "/");
    router.refresh();
  }

  const menuItemClass = "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink outline-none transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400";

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu da clínica ${context.clinicaNome}`}
        onClick={() => {
          setError("");
          setOpen((current) => !current);
        }}
        className="flex items-center gap-2 rounded-full border border-rose-100 bg-white p-1.5 pr-2.5 text-left outline-none transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-400 sm:pr-3"
      >
        <AvatarImage
          src={context.fotoUrl || context.clinicaLogoUrl}
          initials={initials}
          label={context.userNome || context.clinicaNome}
          size={34}
        />
        <span className="hidden max-w-[150px] sm:block">
          <span className="block truncate text-xs font-semibold">{context.clinicaNome || "EsteticaFlow"}</span>
          <span className="block text-left text-[10px] text-muted">{roleLabel}</span>
        </span>
        <ChevronDown size={15} aria-hidden="true" className={`text-muted transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu do usuário"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(320px,calc(100vw-32px))] max-w-[calc(100vw-32px)] rounded-2xl border border-rose-100 bg-white p-2.5 shadow-[0_16px_45px_rgba(74,38,44,0.16)] animate-menu-in motion-reduce:animate-none"
        >
          <div className="flex items-center gap-3 rounded-xl bg-rose-50/70 p-3">
            <AvatarImage
              src={context.fotoUrl || context.clinicaLogoUrl}
              initials={initials}
              label={context.userNome || context.clinicaNome}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{context.userNome || "Seu perfil"}</p>
              <p className="mt-0.5 text-xs text-muted">{roleLabel}</p>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-ink">
                {context.clinicaLogoUrl && (
                  <AvatarImage src={context.clinicaLogoUrl} initials="" label={`Logo de ${context.clinicaNome}`} size={18} />
                )}
                <span className="truncate">{context.clinicaNome}</span>
              </p>
            </div>
          </div>

          <div className="mt-2 space-y-0.5">
            <Link href="/perfil" role="menuitem" tabIndex={0} onClick={() => setOpen(false)} className={menuItemClass}>
              <UserRound size={17} aria-hidden="true" /> Meu perfil
            </Link>
            <Link href="/suporte" role="menuitem" tabIndex={0} onClick={() => setOpen(false)} className={menuItemClass}>
              <LifeBuoy size={17} aria-hidden="true" /> Central de suporte
            </Link>
            <button type="button" role="menuitem" tabIndex={0} onClick={() => { setOpen(false); window.dispatchEvent(new Event("reopen-tour")); }} className={menuItemClass}>
              <Play size={17} aria-hidden="true" /> Tutorial
            </button>
            {context.role === "dona" && (
              <>
                <Link href="/clinica" role="menuitem" tabIndex={0} onClick={() => setOpen(false)} className={menuItemClass}>
                  <Building2 size={17} aria-hidden="true" /> Dados da clínica
                </Link>
                <Link href="/equipe" role="menuitem" tabIndex={0} onClick={() => setOpen(false)} className={menuItemClass}>
                  <Users size={17} aria-hidden="true" /> Equipe
                </Link>
              </>
            )}
          </div>

          {context.clinicas.length > 1 && (
            <div className="mt-2 border-t border-rose-100 pt-2">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Trocar de clínica</p>
              <div className="space-y-0.5">
                {context.clinicas.map((clinic) => (
                  <button
                    key={clinic.clinicaId}
                    type="button"
                    role="menuitem"
                    tabIndex={0}
                    disabled={switching}
                    aria-current={clinic.clinicaId === context.clinicaId ? "true" : undefined}
                    onClick={() => void changeClinic(clinic.clinicaId)}
                    className={`${menuItemClass} justify-between disabled:opacity-60`}
                  >
                    <span className="truncate">{clinic.clinicaNome}</span>
                    {clinic.clinicaId === context.clinicaId && <span className="text-xs text-rose-600">Atual</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p role="alert" className="px-3 py-2 text-xs text-red-700">{error}</p>}

          <div className="mt-2 border-t border-rose-100 pt-2">
            <form action={logoutFromMenuAction}>
              <button type="submit" role="menuitem" tabIndex={0} className={`${menuItemClass} text-red-700 hover:bg-red-50`}>
                <LogOut size={17} aria-hidden="true" /> Sair da conta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
