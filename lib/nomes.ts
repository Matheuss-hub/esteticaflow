export function primeiroNome(texto: string | null | undefined): string {
  const nome = texto?.trim().split(/\s+/)[0];
  if (!nome) return "";
  return nome.charAt(0).toLocaleUpperCase("pt-BR") + nome.slice(1);
}

export function iniciaisNome(texto: string | null | undefined): string {
  const palavras = texto?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!palavras.length) return "";
  if (palavras.length === 1) return palavras[0].slice(0, 2).toLocaleUpperCase("pt-BR");
  return `${palavras[0][0]}${palavras[palavras.length - 1][0]}`.toLocaleUpperCase("pt-BR");
}
