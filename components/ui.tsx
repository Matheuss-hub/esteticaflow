import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-500">{eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-[38px]">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-rose-100 bg-white p-5 shadow-soft md:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <strong className="font-semibold">Não foi possível carregar os dados.</strong>
      <p className="mt-1 break-words">{message}</p>
      <p className="mt-2 text-xs">Confira a conexão, a chave pública e as permissões RLS das tabelas no Supabase.</p>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-rose-200 px-4 py-9 text-center text-sm text-muted">{children}</div>;
}
