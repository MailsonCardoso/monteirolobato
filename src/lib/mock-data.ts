export type AlunoStatus = "ativo" | "inativo";
export type SituacaoFinanceira = "em_dia" | "em_atraso" | "inadimplente";
export type MensalidadeStatus = "pendente" | "pago" | "atrasado";
export type FormaPagamento = "pix" | "debito" | "credito";
export type OrigemPagamento =
  | "mercadopago"
  | "caixa"
  | "admin"
  | "pix_manual"
  | "dinheiro"
  | "transferencia";

export interface Aluno {
  id: string;
  nome: string;
  sexo: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  nomePai?: string;
  nomeMae?: string;
  responsavel: string;
  cpfResponsavel: string;
  telefoneResponsavel: string;
  turma: string;
  status: "ativo" | "inativo";
  valorMensalidade: number;
  diaVencimento: number;
  anoLetivo?: string;
  situacao?: "em_dia" | "em_atraso" | "inadimplente";
  createdAt?: string;
  updatedAt?: string;
}

export interface Mensalidade {
  id: string;
  alunoId: string;
  mesReferencia: string;
  valor: number;
  valorCobrado?: number | null;
  dataVencimento: string;
  dataPagamento: string | null;
  status: MensalidadeStatus;
  formaPagamento: FormaPagamento | null;
  origem: OrigemPagamento | null;
  alunoNome?: string;
  alunoResponsavel?: string;
  alunoSexo?: string;
}

const romanos = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º"];
const letrasTurma = ["A", "B", "C"];

export const turmas: string[] = romanos.flatMap((romano) =>
  letrasTurma.map((letra) => `${romano} Ano ${letra}`),
);

export const anosLetivos = ["2026", "2027", "2028", "2029", "2030"] as const;
