import jsPDF from "jspdf";
import type { Mensalidade } from "@/lib/mock-data";
import { brl, fmtDate, fmtDateFull, numeroExtenso } from "@/lib/format";

const formaPagamentoLabel: Record<string, string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
};

function labelPagamento(m: Mensalidade): string {
  if (m.formaPagamento) return formaPagamentoLabel[m.formaPagamento] ?? m.formaPagamento;
  if (m.origem === "mercadopago") return "Mercado Pago";
  if (m.origem === "pix_manual") return "PIX";
  return "—";
}

export function gerarPdfBlob(m: Mensalidade): Promise<Blob> {
  const dataPg = m.dataPagamento ? fmtDateFull(m.dataPagamento) : "—";
  const valorCobrado = m.valorCobrado != null ? m.valorCobrado : m.valor;
  const temTaxa = valorCobrado > m.valor + 0.004;
  const valorExtensoCobrado = numeroExtenso(valorCobrado);
  const rotulo = m.alunoSexo === "feminino" ? "Aluna" : "Aluno";
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ml = 25;
  const cw = 160;
  let y = 35;

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("Recibo de Pagamento do Associado", ml + cw / 2, y, { align: "center" });

  y += 9;
  doc.setFontSize(8);
  doc.text("ASSOCIAÇÃO DE PAIS E AMIGOS DO CMCB XLI — MONTEIRO LOBATO (APA)", ml + cw / 2, y, { align: "center" });

  y += 6;
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text("CNPJ nº 50.264.838/0001-60", ml + cw / 2, y, { align: "center" });

  y += 6;
  doc.text(
    "Rua 55, S/N - Quadra 61, Maiobão, Paço do Lumiar/MA, CEP 65.130-000",
    ml + cw / 2,
    y,
    { align: "center" },
  );

  y += 8;
  doc.setDrawColor(200);
  doc.line(ml, y, ml + cw, y);

  y += 12;
  doc.setDrawColor(220);
  doc.setFillColor(248, 248, 248);
  const info: [string, string][] = [
    [`${rotulo}:`, m.alunoNome || "—"],
    ["Responsável:", m.alunoResponsavel || "—"],
    ["Mês:", m.mesReferencia],
    ["Valor pago pelo associado:", `${brl(valorCobrado)} (${valorExtensoCobrado})`],
    ...(temTaxa
      ? ([
          ["Tarifa do meio de pagamento (Mercado Pago):", `- ${brl(valorCobrado - m.valor)}`],
          ["Valor líquido recebido pela associação:", brl(m.valor)],
        ] as [string, string][])
      : []),
    ["Pagamento:", dataPg],
    ["Forma:", labelPagamento(m)],
  ];
  const boxH = info.length * 7 + 12;
  doc.roundedRect(ml, y, cw, boxH, 3, 3, "FD");

  const ix = ml + 6;
  let iy = y + 7;
  const labelW = 60;

  for (const [label, value] of info) {
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text(label, ix, iy);
    doc.setFont("times", "normal");
    doc.text(value, ix + labelW, iy, { maxWidth: cw - labelW - 12 });
    iy += 7;
  }

  y = iy + 10;
  doc.text(`Paço do Lumiar, ${dataPg}.`, ml + cw / 2, y, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(150);
  const agora = new Date();
  doc.text(
    `Documento gerado em ${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    ml + cw / 2,
    288,
    { align: "center" },
  );

  return Promise.resolve(doc.output("blob"));
}

export async function baixarPdfRecibo(m: Mensalidade): Promise<void> {
  const blob = await gerarPdfBlob(m);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprovante-${m.id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
