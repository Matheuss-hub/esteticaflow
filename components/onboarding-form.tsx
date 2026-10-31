"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flower2 } from "lucide-react";
import { createOnboardingClinicAction } from "@/app/actions/auth";

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createOnboardingClinicAction(formData);
      if (result.error) setError(result.error);
      else if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <section className="w-full max-w-[440px] rounded-2xl border border-rose-100 bg-white p-6 shadow-soft sm:p-8">
        <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Flower2 size={23} /></span>
        <h1 className="font-display text-2xl font-semibold text-ink">Vamos configurar sua clínica</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Sua conta está pronta. Informe o nome da clínica para começar.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink">Nome da clínica</span>
            <input required minLength={2} name="nome_clinica" className="w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={pending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{pending ? "Criando clínica..." : "Criar clínica"}</button>
        </form>
      </section>
    </main>
  );
}
