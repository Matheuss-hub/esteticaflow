"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateClinicSettingsAction } from "@/app/actions/settings";
import { ImagePicker } from "@/components/image-picker";
import { iniciaisNome } from "@/lib/nomes";
import { supabase } from "@/lib/supabase/browser";

type ImageChange = { changed: boolean; blob: Blob | null };
const inputClass = "mt-1.5 w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100";

async function removeStorageFile(path: string) {
  try {
    const { error } = await supabase.storage.from("avatares").remove([path]);
    if (error) console.warn("Não foi possível remover um arquivo antigo do Storage.");
  } catch {
    console.warn("Não foi possível remover um arquivo antigo do Storage.");
  }
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const phone = digits.slice(2);
  const firstPartLength = digits.length > 10 ? 5 : 4;
  if (phone.length <= firstPartLength) return `(${ddd}) ${phone}`;
  return `(${ddd}) ${phone.slice(0, firstPartLength)}-${phone.slice(firstPartLength, firstPartLength + 4)}`;
}

export function ClinicSettingsForm({
  clinicId,
  userId,
  name,
  phone,
  email,
  logoUrl,
  logoPath,
  canWrite,
}: {
  clinicId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  logoPath: string | null;
  canWrite: boolean;
}) {
  const [clinicName, setClinicName] = useState(name);
  const [clinicPhone, setClinicPhone] = useState(formatPhone(phone));
  const [image, setImage] = useState<ImageChange>({ changed: false, blob: null });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const initials = iniciaisNome(clinicName);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      let uploadedPath: string | null = null;
      try {
        if (image.changed && image.blob) {
          uploadedPath = `${clinicId}/clinica/${crypto.randomUUID()}.webp`;
          const { error: uploadError } = await supabase.storage.from("avatares").upload(uploadedPath, image.blob, {
            upsert: false,
            contentType: image.blob.type,
          });
          if (uploadError) {
            setError("Não foi possível enviar o logo. Tente novamente.");
            return;
          }
        }

        const result = await updateClinicSettingsAction({
          nome: clinicName,
          telefone: clinicPhone,
          logoPath: image.changed ? uploadedPath : null,
          alterarLogo: image.changed,
        });
        if ("error" in result) {
          if (uploadedPath) await removeStorageFile(uploadedPath);
          setError(result.error);
          return;
        }

        if (image.changed && logoPath) await removeStorageFile(logoPath);
        setImage({ changed: false, blob: null });
        setSuccess(result.success);
        window.dispatchEvent(new Event("clinic-context-updated"));
        router.refresh();
      } catch {
        if (uploadedPath) await removeStorageFile(uploadedPath);
        setError("Não foi possível salvar os dados da clínica. Tente novamente.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-soft md:p-6">
        <h2 className="text-[15px] font-semibold">Logo da clínica</h2>
        {!canWrite && <p role="status" className="mt-2 text-sm text-amber-800">Disponível ao ativar o plano</p>}
        <p className="mt-1 text-xs text-muted">Escolha uma imagem JPG, PNG ou WebP de até 5 MB.</p>
        <div className="mt-5">
          <ImagePicker
            currentUrl={logoUrl}
            initials={initials}
            label={`Logo de ${clinicName}`}
            chooseLabel="Escolher logo"
            removeLabel="Remover logo"
            disabled={!canWrite}
            onImageChange={(blob, changed) => setImage({ blob, changed })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-soft md:p-6">
        <h2 className="text-[15px] font-semibold">Dados da clínica</h2>
        <form onSubmit={save} className="mt-4 space-y-4">
          <fieldset disabled={!canWrite} className="space-y-4 disabled:opacity-60">
          <label className="block">
            <span className="text-xs font-medium text-ink">Nome da clínica *</span>
            <input
              required
              maxLength={120}
              value={clinicName}
              onChange={(event) => setClinicName(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink">Telefone/WhatsApp da clínica</span>
            <input
              inputMode="tel"
              autoComplete="tel"
              maxLength={15}
              value={clinicPhone}
              onChange={(event) => setClinicPhone(formatPhone(event.target.value))}
              placeholder="(11) 99999-9999"
              className={inputClass}
            />
            <span className="mt-1.5 block text-xs text-muted">Informe um telefone com DDD.</span>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink">E-mail da responsável</span>
            <input value={email} readOnly className={`${inputClass} cursor-not-allowed bg-rose-50/60`} />
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          {success && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={pending || !canWrite} aria-disabled={!canWrite} title={!canWrite ? "Disponível ao ativar o plano" : undefined} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              <Save size={16} /> {pending ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
