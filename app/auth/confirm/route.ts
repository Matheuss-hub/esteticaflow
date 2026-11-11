import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function logAuthError(error: { code?: string; status?: number; message: string }) {
  console.error("Falha ao confirmar o e-mail:", {
    code: error.code,
    status: error.status,
    message: error.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mail]"),
  });
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!tokenHash || type !== "email" || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login?erro=link", request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data, error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error || !data.user) {
    if (error) logAuthError(error);
    const failed = NextResponse.redirect(new URL("/login?erro=link", request.url));
    response.cookies.getAll().forEach((cookie) => failed.cookies.set(cookie));
    return failed;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("clinica_membros")
    .select("clinica_id")
    .eq("user_id", data.user.id)
    .limit(1);
  if (membershipError) {
    logAuthError(membershipError);
    response.headers.set("Location", new URL("/onboarding", request.url).toString());
    return response;
  }
  response.headers.set("Location", new URL(membership?.length ? "/" : "/onboarding", request.url).toString());
  return response;
}
