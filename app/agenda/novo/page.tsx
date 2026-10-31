import { AppointmentForm } from "@/components/appointment-form";

export default function NewAppointmentPage({ searchParams }: { searchParams: { paciente_id?: string; servico_id?: string; pacote_id?: string } }) {
  return <AppointmentForm initialPatientId={searchParams.paciente_id ?? ""} initialServiceId={searchParams.servico_id ?? ""} initialPackageId={searchParams.pacote_id ?? ""} />;
}