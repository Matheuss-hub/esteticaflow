import { SignupForm } from "@/components/auth-forms";

export default function SignupPage({ searchParams }: { searchParams: { confirmacao?: string } }) {
  return <SignupForm confirmationEmail={searchParams.confirmacao ?? ""} />;
}
