import { LoginForm } from "@/components/auth-forms";

export default function LoginPage({ searchParams }: { searchParams: { next?: string; erro?: string } }) {
  return <LoginForm nextPath={searchParams.next ?? "/"} linkError={searchParams.erro === "link"} />;
}
