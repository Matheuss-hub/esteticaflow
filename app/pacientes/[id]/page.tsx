import { PatientDetailPage } from "@/components/patient-detail";

export default function PatientPage({ params }: { params: { id: string } }) {
  return <PatientDetailPage patientId={params.id} />;
}