export const SUPORTE_EMAIL = 'iamiltecnologia@gmail.com';
export const SUPORTE_WHATSAPP = '5521971354609'; // só dígitos, com 55
export const SUPORTE_WHATSAPP_EXIBICAO = '(21) 97135-4609';

export function linkWhatsAppSuporte(mensagem: string): string {
  return `https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

export function linkEmailSuporte(assunto: string, corpo: string): string {
  return `mailto:${SUPORTE_EMAIL}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}
