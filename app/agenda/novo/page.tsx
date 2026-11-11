import { AppointmentForm } from "@/components/appointment-form";

type SearchValue = string | string[] | undefined;

function firstValue(value: SearchValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default function NewAppointmentPage({ searchParams }: { searchParams: { paciente_id?: SearchValue; servico_id?: SearchValue; pacote_id?: SearchValue } }) {
  return (
    <AppointmentForm
      initialPatientId={firstValue(searchParams.paciente_id)}
      initialServiceId={firstValue(searchParams.servico_id)}
      initialPackageId={firstValue(searchParams.pacote_id)}
    />
  );
}