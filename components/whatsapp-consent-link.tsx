"use client";

import type { ReactNode, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

export function WhatsAppConsentLink({
  href,
  authorized,
  children,
  className,
  label,
}: {
  href: string;
  authorized: boolean;
  children: ReactNode;
  className: string;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirming) {
      triggerRef.current?.focus();
      return;
    }

    const dialog = dialogRef.current;
    const cancelButton = dialog?.querySelector<HTMLButtonElement>('[data-consent-cancel]');
    cancelButton?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirming(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (focusable.length === 0) return;
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
  }, [confirming]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setConfirming(false);
    }
  }

  if (authorized) {
    return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={className}>{children}</a>;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={confirming}
        onClick={() => setConfirming(true)}
        className={className}
      >
        {children}
      </button>
      {confirming && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/35 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setConfirming(false);
        }}>
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="whatsapp-consent-title"
            aria-describedby="whatsapp-consent-description"
            onKeyDown={handleDialogKeyDown}
            className="w-full max-w-sm rounded-2xl border border-rose-100 bg-white p-5 shadow-soft"
          >
            <h2 id="whatsapp-consent-title" className="text-sm font-semibold text-ink">Confirmar envio pelo WhatsApp</h2>
            <p id="whatsapp-consent-description" className="mt-2 text-sm leading-5 text-muted">
              Esta paciente ainda não autorizou mensagens por WhatsApp. Deseja enviar mesmo assim?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                data-consent-cancel
                onClick={() => setConfirming(false)}
                className="min-h-10 rounded-xl border border-rose-100 px-3 py-2 text-sm font-semibold text-ink hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
              >
                Cancelar
              </button>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setConfirming(false)}
                className="inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                Enviar mesmo assim
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
