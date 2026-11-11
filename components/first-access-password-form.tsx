"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flower2 } from "lucide-react";
import { updateRequiredPasswordAction } from "@/app/actions/auth";

const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";

export function FirstAccessPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateRequiredPasswordAction(formData);
      if (result.error) setError(result.error);
      else if (result.redirectTo) {
        router.replace(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Flower2 size={23} /></span>
          <span className="font-display text-xl font-semibold text-ink">EsteticaFlow</span>
        </div>
        <section className="rounded-2xl border border-rose-100 bg-white p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-ink">Troque sua senha</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Por segurança, crie uma senha só sua para continuar.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink">Nova senha</span>
              <input required minLength={8} autoComplete="new-password" name="senha" type="password" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink">Confirmar nova senha</span>
              <input required minLength={8} autoComplete="new-password" name="confirmar_senha" type="password" className={inputClass} />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <button disabled={pending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">
              {pending ? "Salvando..." : "Salvar e continuar"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
