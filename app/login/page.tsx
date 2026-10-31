import { LoginForm } from "@/components/auth-forms";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return <LoginForm nextPath={searchParams.next ?? "/"} />;
}
