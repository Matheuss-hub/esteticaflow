import { AppointmentForm } from "@/components/appointment-form";

export default function EditAppointmentPage({ params }: { params: { id: string } }) {
  return <AppointmentForm appointmentId={params.id} />;
}