"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateMyPasswordAction, updateMyProfileAction } from "@/app/actions/settings";
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

export function ProfileForm({
  clinicId,
  userId,
  name,
  email,
  photoUrl,
  photoPath,
}: {
  clinicId: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  photoPath: string | null;
}) {
  const [userName, setUserName] = useState(name);
  const [image, setImage] = useState<ImageChange>({ changed: false, blob: null });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const router = useRouter();

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      let uploadedPath: string | null = null;
      try {
        if (image.changed && image.blob) {
          uploadedPath = `${clinicId}/usuarios/${userId}/${crypto.randomUUID()}.webp`;
          const { error: uploadError } = await supabase.storage.from("avatares").upload(uploadedPath, image.blob, {
            upsert: false,
            contentType: image.blob.type,
          });
          if (uploadError) {
            setError("Não foi possível enviar a foto. Tente novamente.");
            return;
          }
        }

        const result = await updateMyProfileAction({
          nome: userName,
          fotoPath: image.changed ? uploadedPath : null,
          alterarFoto: image.changed,
        });
        if ("error" in result) {
          if (uploadedPath) await removeStorageFile(uploadedPath);
          setError(result.error);
          return;
        }

        if (image.changed && photoPath) await removeStorageFile(photoPath);
        setImage({ changed: false, blob: null });
        setSuccess(result.success);
        window.dispatchEvent(new Event("clinic-context-updated"));
        router.refresh();
      } catch {
        if (uploadedPath) await removeStorageFile(uploadedPath);
        setError("Não foi possível salvar seu perfil. Tente novamente.");
      }
    });
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    const form = event.currentTarget;
    const data = new FormData(form);
    startPasswordTransition(async () => {
      const result = await updateMyPasswordAction({
        senha: data.get("nova_senha"),
        confirmarSenha: data.get("confirmar_senha"),
      });
      if ("error" in result) setPasswordError(result.error);
      else {
        setPasswordSuccess(result.success);
        form.reset();
      }
    });
  }

  const initials = iniciaisNome(userName);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-soft md:p-6">
        <h2 className="text-[15px] font-semibold">Foto de perfil</h2>
        <p className="mt-1 text-xs text-muted">Escolha uma imagem JPG, PNG ou WebP de até 5 MB.</p>
        <div className="mt-5">
          <ImagePicker
            currentUrl={photoUrl}
            initials={initials}
            label={`Foto de ${userName || "perfil"}`}
            onImageChange={(blob, changed) => setImage({ blob, changed })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-soft md:p-6">
        <h2 className="text-[15px] font-semibold">Seus dados</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-ink">Nome *</span>
            <input
              required
              maxLength={80}
              autoComplete="name"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink">E-mail</span>
            <input value={email} readOnly className={`${inputClass} cursor-not-allowed bg-rose-50/60`} />
            <span className="mt-1.5 block text-xs text-muted">O e-mail é usado para entrar e não pode ser alterado aqui</span>
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          {success && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">Cancelar</Link>
            <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              <Save size={16} /> {pending ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </form>
      </section>

      <details className="rounded-2xl border border-rose-100 bg-white p-5 shadow-soft md:p-6">
        <summary className="cursor-pointer text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-rose-400">Alterar senha</summary>
        <form onSubmit={updatePassword} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-ink">Nova senha</span>
            <input required minLength={8} autoComplete="new-password" name="nova_senha" type="password" className={inputClass} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink">Confirme a nova senha</span>
            <input required minLength={8} autoComplete="new-password" name="confirmar_senha" type="password" className={inputClass} />
          </label>
          {passwordError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{passwordError}</p>}
          {passwordSuccess && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{passwordSuccess}</p>}
          <button type="submit" disabled={passwordPending} className="inline-flex min-h-11 items-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
            {passwordPending ? "Atualizando..." : "Atualizar senha"}
          </button>
        </form>
      </details>
    </div>
  );
}
