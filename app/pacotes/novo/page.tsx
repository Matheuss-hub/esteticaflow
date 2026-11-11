import { PackageForm } from "@/components/package-pages";

export default function NewPackagePage({ searchParams }: { searchParams: { paciente_id?: string; servico_id?: string } }) {
  return <PackageForm initialPatientId={searchParams.paciente_id ?? ""} initialServiceId={searchParams.servico_id ?? ""} />;
}