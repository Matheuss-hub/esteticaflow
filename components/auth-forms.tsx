"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Eye, EyeOff, Flower2 } from "lucide-react";
import {
  loginAction,
  resendSignupConfirmationAction,
  requestPasswordResetAction,
  signupAction,
  updatePasswordAction,
} from "@/app/actions/auth";

function AuthFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-[440px]">
        <Link href="/login" className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><Flower2 size={23} /></span>
          <span className="font-display text-xl font-semibold text-ink">EsteticaFlow</span>
        </Link>
        <section className="rounded-2xl border border-rose-100 bg-white p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}

function StatusMessage({ error, success }: { error: string; success: string }) {
  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>;
  if (success) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>;
  return null;
}

const inputClass = "w-full rounded-xl border border-rose-100 bg-canvas px-3.5 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const labelClass = "mb-1.5 block text-xs font-medium text-ink";

export function LoginForm({ nextPath = "/", linkError = false }: { nextPath?: string; linkError?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result.error) setError(result.error);
      else if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <AuthFrame title="Acesse sua conta">
      <p className="mt-2 text-sm text-muted">Entre para organizar sua clínica.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <label className="block"><span className={labelClass}>E-mail</span><input required autoComplete="email" name="email" type="email" className={inputClass} /></label>
        <div>
          <label htmlFor="login-password" className={labelClass}>Senha</label>
          <div className="relative">
            <input id="login-password" required autoComplete="current-password" name="senha" type={showPassword ? "text" : "password"} className={`${inputClass} pr-12`} />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div className="text-right"><Link href="/esqueci-senha" className="text-xs font-medium text-rose-700 hover:text-rose-800">Esqueci minha senha</Link></div>
        {linkError && <StatusMessage error="Este link expirou ou já foi usado. Entre com seu e-mail e senha ou peça um novo link." success="" />}
        {error && <StatusMessage error={error} success="" />}
        <button disabled={pending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">{pending ? "Entrando..." : "Entrar"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Ainda não tem uma conta? <Link href="/cadastro" className="font-semibold text-rose-700">Criar clínica</Link></p>
    </AuthFrame>
  );
}

export function SignupForm({ confirmationEmail = "" }: { confirmationEmail?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(Boolean(confirmationEmail));
  const [resendEmail, setResendEmail] = useState(confirmationEmail);
  const [resendSuccess, setResendSuccess] = useState("");

  function resendConfirmation() {
    setError("");
    setResendSuccess("");
    startTransition(async () => {
      const result = await resendSignupConfirmationAction(resendEmail);
      setError(result.error ?? "");
      setResendSuccess(result.success ?? "");
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await signupAction(formData);
      if (result.error) setError(result.error);
      else if (result.redirectTo?.startsWith("/cadastro?confirmacao=")) {
        setShowConfirmation(true);
        router.replace(result.redirectTo);
      } else if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <AuthFrame title={showConfirmation ? "Confira seu e-mail" : "Crie sua clínica"}>
      {showConfirmation ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-6 text-muted">Confira seu e-mail para confirmar a conta. Depois, acesse o link enviado para entrar na sua clínica.</p>
          <label className="block"><span className={labelClass}>E-mail usado no cadastro</span><input required autoComplete="email" type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} className={inputClass} /></label>
          {error && <StatusMessage error={error} success="" />}
          {resendSuccess && <StatusMessage error="" success={resendSuccess} />}
          <button type="button" disabled={pending} onClick={resendConfirmation} className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">{pending ? "Enviando..." : "Reenviar confirmação"}</button>
          <Link href="/login" className="block w-full rounded-xl bg-rose-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-rose-700">Ir para o login</Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Comece com os dados da clínica e da responsável.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block"><span className={labelClass}>Nome da clínica</span><input required minLength={2} name="nome_clinica" className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Seu nome</span><input required minLength={2} autoComplete="name" name="nome" className={inputClass} /></label>
            <label className="block"><span className={labelClass}>E-mail</span><input required autoComplete="email" name="email" type="email" className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Senha</span><input required minLength={8} autoComplete="new-password" name="senha" type="password" className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Confirmar senha</span><input required minLength={8} autoComplete="new-password" name="confirmar_senha" type="password" className={inputClass} /></label>
            {error && <StatusMessage error={error} success="" />}
            <button disabled={pending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60">{pending ? "Criando conta..." : "Criar conta"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">Já tem uma conta? <Link href="/login" className="font-semibold text-rose-700">Entrar</Link></p>
        </>
      )}
    </AuthFrame>
  );
}

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await requestPasswordResetAction(formData);
      setError(result.error ?? "");
      setSuccess(result.success ?? "");
    });
  }

  return (
    <AuthFrame title="Redefinir senha">
      <p className="mt-2 text-sm leading-6 text-muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className={labelClass}>E-mail</span><input required autoComplete="email" name="email" type="email" className={inputClass} /></label>
        <StatusMessage error={error} success={success} />
        <button disabled={pending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{pending ? "Enviando..." : "Enviar link"}</button>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-rose-700">Voltar ao login</Link></p>
    </AuthFrame>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updatePasswordAction(formData);
      if (result.error) setError(result.error);
      else if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <AuthFrame title="Escolha uma nova senha">
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block"><span className={labelClass}>Nova senha</span><input required minLength={8} autoComplete="new-password" name="senha" type="password" className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Confirmar senha</span><input required minLength={8} autoComplete="new-password" name="confirmar_senha" type="password" className={inputClass} /></label>
        {error && <StatusMessage error={error} success="" />}
        <button disabled={pending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{pending ? "Salvando..." : "Atualizar senha"}</button>
      </form>
    </AuthFrame>
  );
}
