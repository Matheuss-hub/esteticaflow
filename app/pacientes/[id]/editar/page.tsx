import { PatientEditPage } from "@/components/patient-detail";

export default function EditPatientPage({ params }: { params: { id: string } }) {
  return <PatientEditPage patientId={params.id} />;
}