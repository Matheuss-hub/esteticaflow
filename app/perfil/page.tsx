import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { iniciaisNome } from "@/lib/nomes";
import { getClinicaAtual } from "@/lib/clinica";

export default async function ProfilePage() {
  const context = await getClinicaAtual();
  if (!context) redirect("/login");

  return (
    <>
      <PageHeading
        eyebrow="Sua conta"
        title="Meu perfil"
        description="Atualize seu nome, sua foto e as informações de acesso."
      />
      <ProfileForm
        clinicId={context.clinicaId}
        userId={context.userId}
        name={context.userNome}
        email={context.email}
        photoUrl={context.fotoUrl}
        photoPath={context.fotoPath}
      />
    </>
  );
}
