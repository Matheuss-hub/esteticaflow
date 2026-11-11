import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui";
import { TeamManager } from "@/components/team-manager";
import { exigirDona } from "@/lib/clinica";

export default async function TeamPage() {
  const authorization = await exigirDona();
  if ("error" in authorization) redirect("/?aviso=equipe-responsavel");

  return (
    <>
      <PageHeading eyebrow="Cuidado em equipe" title="Equipe" description="Cadastre quem trabalha com você. Cada pessoa entra com o próprio e-mail e senha." />
      <TeamManager writeEnabled={authorization.clinic.assinatura.temAcesso} />
    </>
  );
}
