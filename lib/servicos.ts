export type Servico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco: number | null;
};

export function normalizarNomeServico(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}
