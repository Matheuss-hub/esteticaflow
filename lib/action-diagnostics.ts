type DiagnosticAction = "cadastro" | "onboarding";

function redactSensitiveDetails(value: string, sensitiveValues: string[]): string {
  const knownSecrets = [
    ...sensitiveValues,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ];
  const redacted = knownSecrets.reduce<string>(
    (message, secret) => secret ? message.split(secret).join("[valor redigido]") : message,
    value,
  );
  return redacted
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[e-mail redigido]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redigido]")
    .replace(/\b(?:eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sb_(?:publishable|secret)_[A-Za-z0-9_-]+)\b/g, "[chave/token redigido]")
    .replace(/\b(password|passwd|secret|token|api[_-]?key|service[_-]?role|authorization)\s*([:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1$2[valor redigido]")
    .replace(/\b[A-Za-z0-9_+/=-]{32,}\b/g, "[valor redigido]");
}

export function logActionFailure(
  action: DiagnosticAction,
  step: string,
  error: unknown,
  sensitiveValues: string[] = [],
): void {
  let code: string | undefined;
  let message = "Erro desconhecido";

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }
  if (typeof error === "object" && error !== null) {
    if ("message" in error && typeof error.message === "string") message = error.message;
    if ("code" in error && typeof error.code === "string" && /^[A-Za-z0-9_.-]{1,64}$/.test(error.code)) {
      code = error.code;
    }
  }

  console.error(`[${action}] falha em ${step}`, {
    code,
    message: redactSensitiveDetails(message, sensitiveValues),
  });
  console.error("[env]", {
    temUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    temAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    temServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
