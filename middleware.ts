import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/cadastro", "/esqueci-senha", "/redefinir-senha"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isAuthPath = pathname.startsWith("/auth/");
  const isOnboarding = pathname === "/onboarding";

  if (request.headers.has("next-action")) return response;

  if (!user) {
    if (!isPublic && !isAuthPath && !isOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (isOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (
    user.app_metadata?.precisa_trocar_senha === true
    && pathname !== "/trocar-senha"
    && pathname !== "/login"
    && !isAuthPath
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/trocar-senha";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/trocar-senha" || isAuthPath) return response;

  if (isPublic && pathname !== "/esqueci-senha" && pathname !== "/redefinir-senha") {
    const { data: memberships } = await supabase
      .from("clinica_membros")
      .select("clinica_id")
      .eq("user_id", user.id)
      .limit(1);
    const url = request.nextUrl.clone();
    url.pathname = memberships?.length ? "/" : "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/esqueci-senha" || pathname === "/redefinir-senha") {
    return response;
  }

  const { data: memberships } = await supabase
    .from("clinica_membros")
    .select("clinica_id")
    .eq("user_id", user.id)
    .limit(1);

  if (!memberships?.length && !isOnboarding) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (memberships?.length && isOnboarding) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
