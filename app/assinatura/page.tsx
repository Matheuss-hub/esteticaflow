import Link from "next/link";
import { Check, Mail, MessageCircle } from "lucide-react";
import { PageHeading, Panel } from "@/components/ui";
import { getClinicaAtual } from "@/lib/clinica";
import { linkEmailSuporte, linkWhatsAppSuporte } from "@/lib/suporte";
import { redirect } from "next/navigation";

const includedFeatures = [
  "Agenda",
  "Pacientes",
  "Pacotes de sessões",
  "Equipe",
  "Mensagens no WhatsApp",
  "Central de suporte",
];

export default async function SubscriptionPage() {
  const context = await getClinicaAtual();
  if (!context) redirect("/login");

  const statusLabel = context.assinatura.status === "ativa"
    ? "Ativa"
    : context.assinatura.status === "suspensa"
      ? "Suspensa"
      : "Teste grátis";
  const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
  const whatsapp = linkWhatsAppSuporte(`Olá! Quero ativar o plano do EsteticaFlow. Clínica: ${context.clinicaNome}.`);
  const email = linkEmailSuporte("Ajuda com o EsteticaFlow", `Olá! Quero ativar o plano do EsteticaFlow. Clínica: ${context.clinicaNome}.`);

  return (
    <>
      <PageHeading eyebrow="Plano da clínica" title="Assinatura" description="Consulte o acesso e os recursos disponíveis para sua clínica." />
      <Panel title="Status da assinatura" subtitle={statusLabel}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-muted">Início do teste</dt><dd className="mt-1 text-sm font-semibold">{formatDate(context.assinatura.trialInicio)}</dd></div>
          <div><dt className="text-xs text-muted">Término do teste</dt><dd className="mt-1 text-sm font-semibold">{formatDate(context.assinatura.trialFim)}</dd></div>
        </dl>
      </Panel>
      <Panel title="O que está incluído" className="mt-5">
        <ul className="grid gap-3 sm:grid-cols-2">
          {includedFeatures.map((feature) => <li key={feature} className="flex items-center gap-2 text-sm"><Check size={17} className="text-emerald-600" aria-hidden="true" />{feature}</li>)}
        </ul>
      </Panel>
      {context.role === "dona" && (
        <Panel title="Para ativar seu plano, fale com a gente" className="mt-5">
          <div className="flex flex-wrap gap-3">
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"><MessageCircle size={17} aria-hidden="true" /> WhatsApp</a>
            <a href={email} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"><Mail size={17} aria-hidden="true" /> E-mail</a>
          </div>
        </Panel>
      )}
      <p className="mt-5 text-sm text-muted"><Link href="/suporte" className="font-semibold text-rose-700 underline">Central de suporte</Link></p>
    </>
  );
}
