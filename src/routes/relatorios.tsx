import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart,
  FileText,
  TrendingUp,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchAlunos } from "@/lib/api/alunos";
import { fetchMensalidades } from "@/lib/api/mensalidades";
import type { Aluno, Mensalidade } from "@/lib/mock-data";
import { brl } from "@/lib/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { anosLetivos } from "@/lib/mock-data";

export const Route = createFileRoute("/relatorios")({
  component: Relatorios,
});

function parseBr(dateStr: string): Date {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("/");
    return new Date(+y, +m - 1, +d);
  }
  return new Date(dateStr);
}

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

const statusColor: Record<string, [number, number, number]> = {
  pendente: [234, 179, 8],
  pago: [34, 197, 94],
  atrasado: [239, 68, 68],
};

function useReportData() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAlunos(), fetchMensalidades()])
      .then(([a, m]) => { setAlunos(a); setMensalidades(m); })
      .catch(() => toast.error("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  return { alunos, mensalidades, loading };
}

function Relatorios() {
  const { alunos, mensalidades, loading } = useReportData();
  const [ano, setAno] = useState<string>("2027");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Exporte dados em PDF ou Excel"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Ano letivo:</span>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {anosLetivos.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MensalCard
          icon={FileText}
          title="Relatório mensal"
          desc="Receitas e pagamentos do mês atual"
          tone="bg-primary/10 text-primary"
          onPDF={() => gerarPDFMensal(mensalidades, alunos)}
          onExcel={() => gerarExcelMensal(mensalidades, alunos)}
        />
        <MensalCard
          icon={FileBarChart}
          title="Relatório anual"
          desc={`Visão consolidada do ano letivo de ${ano}`}
          tone="bg-info/10 text-info"
          onPDF={() => gerarPDFAnual(mensalidades, alunos, Number(ano))}
          onExcel={() => gerarExcelAnual(mensalidades, alunos, Number(ano))}
        />
        <MensalCard
          icon={AlertTriangle}
          title="Inadimplência"
          desc="Lista detalhada de alunos em atraso"
          tone="bg-destructive/10 text-destructive"
          onPDF={() => gerarPDFInadimplencia(mensalidades, alunos)}
          onExcel={() => gerarExcelInadimplencia(mensalidades, alunos)}
        />
        <MensalCard
          icon={TrendingUp}
          title="Fluxo de caixa"
          desc="Entradas projetadas"
          tone="bg-success/10 text-success"
          onPDF={() => gerarPDFFluxo(mensalidades, alunos)}
          onExcel={() => gerarExcelFluxo(mensalidades, alunos)}
        />
      </div>
    </>
  );
}

function MensalCard({
  icon: Icon,
  title,
  desc,
  tone,
  onPDF,
  onExcel,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  tone: string;
  onPDF: () => void;
  onExcel: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-in">
      <div className={`size-12 rounded-lg grid place-items-center ${tone} mb-4`}>
        <Icon className="size-6" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      <div className="flex gap-2 mt-4">
        <Button onClick={onPDF} size="sm">
          <Download className="size-4" /> PDF
        </Button>
        <Button onClick={onExcel} variant="outline" size="sm">
          <FileSpreadsheet className="size-4" /> Excel
        </Button>
      </div>
    </div>
  );
}

function alunoNome(mensalidades: Mensalidade[], alunos: Aluno[], alunoId: string): string {
  const m = mensalidades.find((x) => x.alunoId === alunoId);
  if (m?.alunoNome) return m.alunoNome;
  const a = alunos.find((x) => x.id === alunoId);
  return a?.nome || alunoId;
}

function headers(doc: jsPDF, title: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(16);
  doc.text(title, pageW / 2, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    pageW / 2,
    27,
    { align: "center" },
  );
  doc.setTextColor(0);
  return 32;
}

function rodape(doc: jsPDF) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Edu Balance - Sistema de Gestão Escolar", pageW / 2, pageH - 10, { align: "center" });
}

function baixarPDF(doc: jsPDF, nome: string) {
  rodape(doc);
  doc.save(`${nome}.pdf`);
  toast.success(`PDF: ${nome} gerado`);
}

function baixarExcel(wb: XLSX.WorkBook, nome: string) {
  XLSX.writeFile(wb, `${nome}.xlsx`);
  toast.success(`Excel: ${nome} gerado`);
}

function gerarPDFMensal(mensalidades: Mensalidade[], alunos: Aluno[]) {
  const doc = new jsPDF();
  const agora = new Date();
  const mes = agora.getMonth();
  const ano = agora.getFullYear();
  const mesNome = agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const top = headers(doc, `Relatório Mensal - ${mesNome}`);

  const filtradas = mensalidades.filter((m) => {
    const v = parseBr(m.dataVencimento);
    return v.getMonth() === mes && v.getFullYear() === ano;
  });

  const recebido = filtradas.filter((m) => m.status === "pago").reduce((s, m) => s + m.valor, 0);
  const pendente = filtradas.filter((m) => m.status === "pendente").reduce((s, m) => s + m.valor, 0);
  const atrasado = filtradas.filter((m) => m.status === "atrasado").reduce((s, m) => s + m.valor, 0);

  autoTable(doc, {
    startY: top + 4,
    head: [["Aluno", "Mês Ref.", "Valor", "Vencimento", "Pagamento", "Status"]],
    body: filtradas.map((m) => [
      m.alunoNome || alunoNome(mensalidades, alunos, m.alunoId),
      m.mesReferencia,
      brl(m.valor),
      m.dataVencimento,
      m.dataPagamento || "-",
      statusLabel[m.status] || m.status,
    ]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    foot: [
      ["", "", "", "", "Total Recebido", brl(recebido)],
      ["", "", "", "", "Total Pendente", brl(pendente)],
      ["", "", "", "", "Total Atrasado", brl(atrasado)],
    ],
    footStyles: { fillColor: [243, 244, 246], textColor: [50, 50, 50], fontStyle: "bold" },
  });

  baixarPDF(doc, `relatorio_mensal_${ano}_${String(mes + 1).padStart(2, "0")}`);
}

function gerarExcelMensal(mensalidades: Mensalidade[], alunos: Aluno[]) {
  const agora = new Date();
  const mes = agora.getMonth();
  const ano = agora.getFullYear();

  const filtradas = mensalidades.filter((m) => {
    const v = parseBr(m.dataVencimento);
    return v.getMonth() === mes && v.getFullYear() === ano;
  });

  const rows = filtradas.map((m) => ({
    Aluno: m.alunoNome || alunoNome(mensalidades, alunos, m.alunoId),
    "Mês Ref.": m.mesReferencia,
    Valor: m.valor,
    Vencimento: m.dataVencimento,
    Pagamento: m.dataPagamento || "-",
    Status: statusLabel[m.status] || m.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const colSizes = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  ws["!cols"] = colSizes;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mensal");
  baixarExcel(wb, `relatorio_mensal_${ano}_${String(mes + 1).padStart(2, "0")}`);
}

function gerarPDFAnual(mensalidades: Mensalidade[], alunos: Aluno[], ano: number = new Date().getFullYear()) {
  const doc = new jsPDF("l", "mm", "a4");
  const top = headers(doc, `Relatório Anual - ${ano}`);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const linhas = meses.map((nome, i) => {
    const doMes = mensalidades.filter((m) => {
      const v = parseBr(m.dataVencimento);
      return v.getMonth() === i && v.getFullYear() === ano;
    });
    return {
      mes: nome,
      recebido: doMes.filter((m) => m.status === "pago").reduce((s, m) => s + m.valor, 0),
      pendente: doMes.filter((m) => m.status === "pendente").reduce((s, m) => s + m.valor, 0),
      atrasado: doMes.filter((m) => m.status === "atrasado").reduce((s, m) => s + m.valor, 0),
    };
  });

  const totalRecebido = linhas.reduce((s, l) => s + l.recebido, 0);
  const totalPendente = linhas.reduce((s, l) => s + l.pendente, 0);
  const totalAtrasado = linhas.reduce((s, l) => s + l.atrasado, 0);

  autoTable(doc, {
    startY: top + 4,
    head: [["Mês", "Recebido", "Pendente", "Atrasado", "Total"]],
    body: linhas.map((l) => [
      l.mes,
      brl(l.recebido),
      brl(l.pendente),
      brl(l.atrasado),
      brl(l.recebido + l.pendente + l.atrasado),
    ]),
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    foot: [
      ["Total", brl(totalRecebido), brl(totalPendente), brl(totalAtrasado), brl(totalRecebido + totalPendente + totalAtrasado)],
    ],
    footStyles: { fillColor: [243, 244, 246], textColor: [50, 50, 50], fontStyle: "bold" },
  });

  baixarPDF(doc, `relatorio_anual_${ano}`);
}

function gerarExcelAnual(mensalidades: Mensalidade[], _alunos: Aluno[], ano: number = new Date().getFullYear()) {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const rows = meses.map((nome, i) => {
    const doMes = mensalidades.filter((m) => {
      const v = parseBr(m.dataVencimento);
      return v.getMonth() === i && v.getFullYear() === ano;
    });
    return {
      Mês: nome,
      Recebido: doMes.filter((m) => m.status === "pago").reduce((s, m) => s + m.valor, 0),
      Pendente: doMes.filter((m) => m.status === "pendente").reduce((s, m) => s + m.valor, 0),
      Atrasado: doMes.filter((m) => m.status === "atrasado").reduce((s, m) => s + m.valor, 0),
      Total: doMes.reduce((s, m) => s + m.valor, 0),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Anual");
  baixarExcel(wb, `relatorio_anual_${ano}`);
}

function gerarPDFInadimplencia(mensalidades: Mensalidade[], alunos: Aluno[]) {
  const doc = new jsPDF("l", "mm", "a4");
  const top = headers(doc, "Relatório de Inadimplência");

  const atrasadas = mensalidades.filter((m) => m.status === "atrasado");
  const alunosInad = alunos.filter((a) => a.situacao === "inadimplente" || a.situacao === "em_atraso");

  autoTable(doc, {
    startY: top + 4,
    head: [["Aluno", "Responsável", "Telefone", "Mês Ref.", "Valor", "Vencimento", "Dias"]],
    body: atrasadas.map((m) => {
      const a = alunos.find((x) => x.id === m.alunoId);
      const venc = parseBr(m.dataVencimento);
      const dias = Math.floor((Date.now() - venc.getTime()) / (1000 * 60 * 60 * 24));
      return [
        m.alunoNome || a?.nome || "-",
        m.alunoResponsavel || a?.responsavel || "-",
        a?.telefone || "-",
        m.mesReferencia,
        brl(m.valor),
        m.dataVencimento,
        `${dias} dias`,
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: [239, 68, 68] },
  });

  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Total de alunos inadimplentes: ${alunosInad.length}`, 14, y);
  doc.text(
    `Total em atraso: ${brl(atrasadas.reduce((s, m) => s + m.valor, 0))}`,
    14,
    y + 6,
  );

  baixarPDF(doc, "relatorio_inadimplencia");
}

function gerarExcelInadimplencia(mensalidades: Mensalidade[], alunos: Aluno[]) {
  const atrasadas = mensalidades.filter((m) => m.status === "atrasado");
  const rows = atrasadas.map((m) => {
    const a = alunos.find((x) => x.id === m.alunoId);
    const venc = parseBr(m.dataVencimento);
    const dias = Math.floor((Date.now() - venc.getTime()) / (1000 * 60 * 60 * 24));
    return {
      Aluno: m.alunoNome || a?.nome || "-",
      Responsável: m.alunoResponsavel || a?.responsavel || "-",
      Telefone: a?.telefone || "-",
      "Mês Ref.": m.mesReferencia,
      Valor: m.valor,
      Vencimento: m.dataVencimento,
      "Dias em atraso": dias,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inadimplência");
  baixarExcel(wb, "relatorio_inadimplencia");
}

function gerarPDFFluxo(mensalidades: Mensalidade[], alunos: Aluno[]) {
  const doc = new jsPDF("l", "mm", "a4");
  const top = headers(doc, "Fluxo de Caixa - Projeção");

  const aReceber = mensalidades.filter((m) => m.status !== "pago");

  const agrupado: Record<string, { receber: number; qtd: number }> = {};
  for (const m of aReceber) {
    const chave = m.mesReferencia;
    if (!agrupado[chave]) agrupado[chave] = { receber: 0, qtd: 0 };
    agrupado[chave].receber += m.valor;
    agrupado[chave].qtd += 1;
  }

  const linhas = Object.entries(agrupado).sort(([a], [b]) => a.localeCompare(b));

  autoTable(doc, {
    startY: top + 4,
    head: [["Período", "Qtde.", "Valor a Receber"]],
    body: linhas.map(([periodo, v]) => [periodo, String(v.qtd), brl(v.receber)]),
    theme: "grid",
    headStyles: { fillColor: [34, 197, 94] },
    foot: [
      [
        "Total",
        String(aReceber.length),
        brl(aReceber.reduce((s, m) => s + m.valor, 0)),
      ],
    ],
    footStyles: { fillColor: [243, 244, 246], textColor: [50, 50, 50], fontStyle: "bold" },
  });

  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Mensalidades pendentes: ${aReceber.filter((m) => m.status === "pendente").length}`, 14, y);
  doc.text(`Mensalidades atrasadas: ${aReceber.filter((m) => m.status === "atrasado").length}`, 14, y + 6);

  baixarPDF(doc, "fluxo_caixa");
}

function gerarExcelFluxo(mensalidades: Mensalidade[], alunos: Aluno[]) {
  const aReceber = mensalidades.filter((m) => m.status !== "pago");
  const rows = aReceber.map((m) => ({
    Aluno: m.alunoNome || alunoNome(mensalidades, alunos, m.alunoId),
    "Mês Ref.": m.mesReferencia,
    Valor: m.valor,
    Vencimento: m.dataVencimento,
    Status: statusLabel[m.status] || m.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");
  baixarExcel(wb, "fluxo_caixa");
}
