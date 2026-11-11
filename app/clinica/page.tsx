import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui";
import { ClinicSettingsForm } from "@/components/clinic-settings-form";
import { exigirDona } from "@/lib/clinica";

export default async function ClinicSettingsPage() {
  const authorization = await exigirDona();
  if ("error" in authorization) redirect("/?aviso=clinica-responsavel");
  const { clinic: context } = authorization;

  return (
    <>
      <PageHeading
        eyebrow="Configurações"
        title="Dados da clínica"
        description="Mantenha as informações e a identidade da sua clínica atualizadas."
      />
      <ClinicSettingsForm
        clinicId={context.clinicaId}
        userId={context.userId}
        name={context.clinicaNome}
        phone={context.clinicaTelefone}
        email={context.emailResponsavel}
        logoUrl={context.clinicaLogoUrl}
        logoPath={context.clinicaLogoPath}
        canWrite={context.assinatura.temAcesso}
      />
    </>
  );
}
