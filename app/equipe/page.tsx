import { PageHeading } from "@/components/ui";
import { TeamManager } from "@/components/team-manager";

export default function TeamPage() {
  return (
    <>
      <PageHeading eyebrow="Cuidado em equipe" title="Equipe" description="Convide atendentes e gerencie quem acessa sua clínica." />
      <TeamManager />
    </>
  );
}
