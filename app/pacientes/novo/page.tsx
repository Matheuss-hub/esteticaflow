import { PatientForm } from "@/components/patient-form";
import { getClinicaAtual } from "@/lib/clinica";

export default async function NewPatientPage() {
  const context = await getClinicaAtual();
  return <PatientForm canWrite={context?.assinatura.temAcesso ?? false} />;
}