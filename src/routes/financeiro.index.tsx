import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  History,
  ImageDown,
  Loader2,
  MessageCircle,
  MoreVertical,
  Plus,
  Pencil,
  CalendarClock,
  RefreshCw,
  Search,
  Trash2,
  X,
  TrendingUp,
  Wallet,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared/Primitives";
import { ActionSheet } from "@/components/shared/ActionSheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Mensalidade, Aluno, FormaPagamento, OrigemPagamento } from "@/lib/mock-data";
import { brl, fmtDate, fmtDateFull, maskDate, numeroExtenso } from "@/lib/format";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { ReciboVisual } from "@/components/shared/ReciboVisual";
import { baixarPngRecibo } from "@/lib/recibo-png";
import { fetchAlunos } from "@/lib/api/alunos";
import {
  fetchMensalidade,
  fetchMensalidadesPage,
  createMensalidade,
  updateMensalidade,
  deleteMensalidade,
  gerarProximoMesFaltante,
  pagarMensalidade,
  sincronizarMensalidadesNoCaixa,
} from "@/lib/api/mensalidades";
import { fetchDashboardFinanceiro, type DashboardFinanceiro } from "@/lib/api/dashboard-financeiro";
import { fetchCategories } from "@/lib/api/financial-categories";

export const Route = createFileRoute("/financeiro/")({
  component: Financeiro,
});

const formaPagamentoLabel: Record<string, string> = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
};

const origemPagamentoLabel: Record<string, string> = {
  mercadopago: "Mercado Pago",
  caixa: "Caixa",
  admin: "Admin",
  pix_manual: "PIX",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

const formaPagamentoExibida = (m: {
  formaPagamento?: string | null;
  origem?: string | null;
}) => {
  if (m.origem === "dinheiro" && !m.formaPagamento) return "Dinheiro";
  return m.formaPagamento ? formaPagamentoLabel[m.formaPagamento] : "—";
};

function Financeiro() {
  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [data, setData] = useState<Mensalidade[]>([]);
  const [total, setTotal] = useState(0);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [categories, setCategories] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("pago");
  const [selectedMensalidade, setSelectedMensalidade] = useState<Mensalidade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mensalidade | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({
    alunoId: "",
    mesReferencia: "",
    valor: 0,
    dataVencimento: "",
    formaPagamento: "nenhuma",
  });

  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [pagamentoId, setPagamentoId] = useState("");
  const [pagamentoForma, setPagamentoForma] = useState("");
  const [reciboMensalidade, setReciboMensalidade] = useState<Mensalidade | null>(null);
  const [gerando, setGerando] = useState(false);
  const [gerandoImg, setGerandoImg] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const reciboRef = useRef<HTMLDivElement>(null);

  const carregar = async () => {
    carregarComplementares();
    try {
      setAlunos(await fetchAlunos());
    } catch {
      toast.error("Erro ao carregar dados");
    }
  };

  const carregarLista = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMensalidadesPage({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: debouncedQ || undefined,
        page,
        perPage,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedQ, page, perPage]);

  const carregarComplementares = async () => {
    try {
      const [d, c] = await Promise.all([fetchDashboardFinanceiro(), fetchCategories()]);
      setDashboard(d);
      setCategories(c);
    } catch {
      toast.error("Erro ao carregar saldos");
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter]);

  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

  const gerarProximoMes = async () => {
    setGerando(true);
    try {
      const { mesReferencia, criadas } = await gerarProximoMesFaltante(10);
      toast.success(
        criadas > 0
          ? `${criadas} mensalidade(s) de ${mesReferencia} criada(s)`
          : `Mês ${mesReferencia} já está completo`,
      );
      carregar();
      carregarLista();
    } catch {
      toast.error("Erro ao gerar mensalidades");
    } finally {
      setGerando(false);
    }
  };

  const sincronizarCaixa = async () => {
    setSincronizando(true);
    try {
      const res = await sincronizarMensalidadesNoCaixa();
      toast.success(
        res.sincronizadas > 0
          ? `${res.sincronizadas} entrada(s) criada(s) no Fluxo de Caixa`
          : res.ignoradas > 0
            ? `Nenhuma entrada pendente. ${res.ignoradas} ignorada(s) por mês finalizado.`
            : "Nenhuma entrada pendente de sincronização",
      );
      carregar();
      carregarLista();
    } catch {
      toast.error("Erro ao sincronizar caixa");
    } finally {
      setSincronizando(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const mesCorrente = () => {
    const hoje = new Date();
    const mes = hoje.toLocaleDateString("pt-BR", { month: "long" });
    return mes.charAt(0).toUpperCase() + mes.slice(1) + "/" + hoje.getFullYear();
  };

  const abrirForm = (mode: "create" | "edit", mensalidade?: Mensalidade) => {
    setFormMode(mode);
    if (mode === "edit" && mensalidade) {
      setFormData({
        alunoId: mensalidade.alunoId,
        mesReferencia: mensalidade.mesReferencia,
        valor: mensalidade.valor,
        dataVencimento: mensalidade.dataVencimento,
        formaPagamento: mensalidade.formaPagamento ?? "nenhuma",
      });
    } else {
      setFormData({
        alunoId: "",
        mesReferencia: mesCorrente(),
        valor: 0,
        dataVencimento: "",
        formaPagamento: "nenhuma",
      });
    }
    setFormOpen(true);
  };

  const aoSelecionarAluno = (alunoId: string) => {
    const aluno = alunos.find((a) => a.id === alunoId);
    if (!aluno) return;
    const hoje = new Date();
    const mesNum = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(aluno.diaVencimento || 10).padStart(2, "0");
    setFormData((f) => ({
      ...f,
      alunoId,
      valor: aluno.valorMensalidade,
      dataVencimento: `${dia}/${mesNum}/${hoje.getFullYear()}`,
    }));
  };

  const toIsoDate = (ddmmaaa: string) => {
    const partes = ddmmaaa.split("/");
    if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
    return ddmmaaa;
  };

  const salvarForm = async () => {
    try {
      const dataVencimento = toIsoDate(formData.dataVencimento);
      const formaPg = formData.formaPagamento === "nenhuma" ? null : formData.formaPagamento;
      if (formMode === "create") {
        await createMensalidade({
          alunoId: formData.alunoId,
          mesReferencia: formData.mesReferencia,
          valor: formData.valor,
          dataVencimento,
          status: "pendente",
          formaPagamento: formaPg as FormaPagamento | null,
        });
        toast.success("Mensalidade criada!");
      } else {
        await updateMensalidade(selectedMensalidade!.id, {
          alunoId: formData.alunoId,
          mesReferencia: formData.mesReferencia,
          valor: formData.valor,
          dataVencimento,
          formaPagamento: formaPg as FormaPagamento | null,
        });
        toast.success("Mensalidade atualizada!");
      }
      setFormOpen(false);
      setSelectedMensalidade(null);
      carregar();
      carregarLista();
    } catch {
      toast.error("Erro ao salvar mensalidade");
    }
  };

  const confirmarPagamento = async () => {
    if (confirmando) return;
    setConfirmando(true);
    try {
      const ehPix = pagamentoForma === "pix";
      const updated = await pagarMensalidade(pagamentoId, {
        formaPagamento: ehPix ? "pix" : null,
        origem: ehPix ? "pix_manual" : "dinheiro",
      });
      toast.success("Pagamento registrado!");
      setPagamentoOpen(false);
      setSelectedMensalidade(null);
      const atual = await fetchMensalidade(pagamentoId).catch(() => null);
      setReciboMensalidade(atual ?? updated);
      setData((prev) => prev.map((m) => (m.id === pagamentoId ? atual ?? updated : m)));
    } catch {
      const atual = await fetchMensalidade(pagamentoId).catch(() => null);
      if (atual?.status === "pago") {
        toast.success("Pagamento registrado!");
        setPagamentoOpen(false);
        setSelectedMensalidade(null);
        setReciboMensalidade(atual);
        setData((prev) => prev.map((m) => (m.id === pagamentoId ? atual : m)));
      } else {
        toast.error("Erro ao registrar pagamento");
      }
    } finally {
      setConfirmando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMensalidade(deleteTarget.id);
      toast.success("Mensalidade excluída");
      setDeleteTarget(null);
      setSelectedMensalidade(null);
      carregar();
      carregarLista();
    } catch {
      toast.error("Erro ao excluir mensalidade");
    }
  };

  const whatsAppUrl = (m: Mensalidade) => {
    const a = alunos.find((x) => x.id === m.alunoId);
    const phone = a?.telefoneResponsavel?.replace(/\D/g, "") || a?.telefone?.replace(/\D/g, "");
    if (!phone) return null;
    const msg = encodeURIComponent(
      `Olá! ${m.alunoResponsavel || a?.responsavel || "Responsável"}\n\nLembramos que a fatura referente ao ${m.alunoSexo === "feminino" ? "aluna" : "aluno"} ${m.alunoNome || a?.nome || ""} abaixo encontra-se em aberto. Caso já tenha pago, desconsidere esta mensagem.\n\nDetalhes da fatura:\n• Referência: ${m.mesReferencia}\n• Valor: ${brl(m.valor)}\n• Vencimento: ${fmtDate(m.dataVencimento)}\n• Situação: ${m.status === "atrasado" ? "Em atraso" : "Pendente"}\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\n2 de Julho — Unidade XLI — Monteiro Lobato`,
    );
    return `https://wa.me/55${phone}?text=${msg}`;
  };

  const gerarPdfBlob = (m: Mensalidade): Promise<Blob> => {
    const dataPg = m.dataPagamento ? fmtDateFull(m.dataPagamento) : "—";
    const valorCobrado = m.valorCobrado != null ? m.valorCobrado : m.valor;
    const temTaxa = valorCobrado > m.valor + 0.004;
    const valorExtensoCobrado = numeroExtenso(valorCobrado);
    const rotuloAluno = m.alunoSexo === "feminino" ? "Aluna" : "Aluno";
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const ml = 25;
    const cw = 160;
    let y = 30;

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Recibo de Pagamento do Associado", ml + cw / 2, y, { align: "center" });

    y += 10;
    doc.setFontSize(8);
    doc.text("ASSOCIAÇÃO DE PAIS E AMIGOS DO CMCB XLI — MONTEIRO LOBATO (APA)", ml + cw / 2, y, { align: "center" });

    y += 6;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text("CNPJ nº 50.264.838/0001-60", ml + cw / 2, y, { align: "center" });

    y += 6;
    doc.text(
      "Rua 55, S/N - Quadra 61, Maiobão, Paço do Lumiar/MA, CEP 65.130-000",
      ml + cw / 2,
      y,
      {
        align: "center",
      },
    );

    y += 8;
    doc.setDrawColor(200);
    doc.line(ml, y, ml + cw, y);

    y += 8;
    doc.setFontSize(10);
    doc.text(
      "Declaro, para os devidos fins, que recebi Mensalidade/Contribuição Associativa abaixo discriminada:",
      ml,
      y,
      { maxWidth: cw, align: "justify" },
    );

    y += 14;
    doc.setDrawColor(220);
    doc.setFillColor(248, 248, 248);
    const info: [string, string][] = [
      [`${rotuloAluno}:`, m.alunoNome || "—"],
      ["Responsável:", m.alunoResponsavel || "—"],
      ["Mês de Referência:", m.mesReferencia],
      ["Valor pago pelo associado:", `${brl(valorCobrado)} (${valorExtensoCobrado})`],
      ...(temTaxa
        ? ([
            ["Tarifa do meio de pagamento (Mercado Pago):", `- ${brl(valorCobrado - m.valor)}`],
            ["Valor líquido recebido pela associação:", brl(m.valor)],
          ] as [string, string][])
        : []),
      ["Data do Pagamento:", m.dataPagamento ? fmtDate(m.dataPagamento) : "—"],
      ["Forma de Pagamento:", formaPagamentoExibida(m)],
      ["Origem:", m.origem ? origemPagamentoLabel[m.origem] : "—"],
    ];
    const boxH = info.length * 7 + 12;
    doc.roundedRect(ml, y, cw, boxH, 3, 3, "FD");
    const ix = ml + 6;
    let iy = y + 7;
    const labelW = 58;
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    for (const [label, value] of info) {
      doc.setFont("times", "bold");
      doc.text(label, ix, iy);
      doc.setFont("times", "normal");
      doc.text(value, ix + labelW, iy, { maxWidth: cw - labelW - 12 });
      iy += 7;
    }

    y = iy + 8;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(
      "Por ser verdade, firmo o presente recibo para que produza os efeitos legais cabíveis.",
      ml,
      y,
      { maxWidth: cw, align: "justify" },
    );

    y += 12;
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
  };

  const baixarPdf = async (m: Mensalidade) => {
    const blob = await gerarPdfBlob(m);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibo-${m.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const baixarPng = async (m: Mensalidade) => {
    if (!reciboRef.current || gerandoImg) return;
    setGerandoImg(true);
    try {
      await baixarPngRecibo(reciboRef.current, `recibo-${m.id}`);
      toast.success("Imagem baixada. Pronta para enviar em qualquer app.");
    } catch {
      toast.error("Erro ao gerar a imagem do recibo");
    } finally {
      setGerandoImg(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Mensalidades, pagamentos e histórico"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={sincronizarCaixa} disabled={sincronizando}>
              {sincronizando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sincronizar caixa
            </Button>
            <Button variant="outline" onClick={gerarProximoMes} disabled={gerando}>
              {gerando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarClock className="size-4" />
              )}
              Gerar próximo mês
            </Button>
            <Button onClick={() => abrirForm("create")}>
              <Plus className="size-4" /> Nova mensalidade
            </Button>
          </div>
        }
      />

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-success mb-1">
              <TrendingUp className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Recebido no Mês</span>
            </div>
            <p className="text-2xl font-semibold text-success">{brl(dashboard.receita_mes)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.qtd_pagas} mensalidade(s) paga(s)
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-warning mb-1">
              <Wallet className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">A Receber</span>
            </div>
            <p className="text-2xl font-semibold text-warning">{brl(dashboard.total_pendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.qtd_pendentes} pendentes
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Vencidos</span>
            </div>
            <p className="text-2xl font-semibold text-destructive">
              {brl(dashboard.total_vencido)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{dashboard.qtd_vencidas} em atraso</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-info mb-1">
              <UserX className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Inadimplência</span>
            </div>
            <p className="text-2xl font-semibold text-info">{dashboard.perc_inadimplencia}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.alunos_inadimplentes} de {dashboard.alunos_ativos} alunos
            </p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar aluno ou mês..."
              className="pl-9 h-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <EmptyState title="Sem mensalidades" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{m.alunoNome || "—"}</td>
                    <td className="px-4 py-3">{m.mesReferencia}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(m.dataVencimento)}</td>
                    <td className="px-4 py-3 font-medium">{brl(m.valor)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {m.formaPagamento || m.origem === "dinheiro" ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="capitalize">
                            {formaPagamentoExibida(m)}
                          </span>
                          {m.origem && m.origem !== "dinheiro" && (
                            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-100">
                              {origemPagamentoLabel[m.origem]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedMensalidade(m)}
                        className="p-1.5 rounded hover:bg-accent"
                        title="Ações"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Exibindo {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} de{" "}
                {total}
              </span>
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}/pág
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className="w-9"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      <ActionSheet
        open={
          !!selectedMensalidade &&
          !formOpen &&
          !pagamentoOpen &&
          !deleteTarget &&
          !reciboMensalidade
        }
        onOpenChange={(open) => {
          if (!open) setSelectedMensalidade(null);
        }}
        title={
          selectedMensalidade
            ? `${selectedMensalidade.alunoNome || "—"} — ${selectedMensalidade.mesReferencia}`
            : ""
        }
        description={
          selectedMensalidade
            ? `${brl(selectedMensalidade.valor)} — ${selectedMensalidade.status.replace("_", " ")}`
            : ""
        }
        actions={
          selectedMensalidade
            ? [
                {
                  label: "Editar",
                  icon: <Pencil className="size-5" />,
                  onClick: () => abrirForm("edit", selectedMensalidade),
                },
                ...(selectedMensalidade.status !== "pago"
                  ? [
                      {
                        label: "Registrar pagamento",
                        icon: <CheckCircle2 className="size-5" />,
                        onClick: () => {
                          setPagamentoId(selectedMensalidade.id);
                          setPagamentoForma("pix");
                          setPagamentoOpen(true);
                        },
                      },
                    ]
                  : []),
                ...(selectedMensalidade.status === "pago"
                  ? [
                      {
                        label: "Recibo",
                        icon: <FileText className="size-5" />,
                        onClick: () => setReciboMensalidade(selectedMensalidade),
                      },
                    ]
                  : []),
                ...(selectedMensalidade.status !== "pago"
                  ? [
                      {
                        label: "Cobrar WhatsApp",
                        icon: <MessageCircle className="size-5" />,
                        onClick: () => {
                          const url = whatsAppUrl(selectedMensalidade);
                          if (url) window.open(url, "_blank");
                          else toast.error("Telefone não encontrado para este aluno");
                        },
                      },
                    ]
                  : []),
                {
                  label: "Excluir",
                  icon: <Trash2 className="size-5" />,
                  destructive: true,
                  onClick: () => setDeleteTarget(selectedMensalidade),
                },
              ]
            : []
        }
      />

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-4 sm:p-6">
          <SheetHeader className="pr-8">
            <SheetTitle>
              {formMode === "create" ? "Nova mensalidade" : "Editar mensalidade"}
            </SheetTitle>
            <SheetDescription>
              {formMode === "create"
                ? "Preencha os dados para criar uma nova mensalidade"
                : "Altere os dados da mensalidade"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Aluno
              </label>
              <Select value={formData.alunoId} onValueChange={aoSelecionarAluno}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um aluno..." />
                </SelectTrigger>
                <SelectContent>
                  {alunos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Mês referência
              </label>
              <Input
                className="h-10"
                placeholder="Ex: Junho/2026"
                value={formData.mesReferencia}
                onChange={(e) => setFormData((f) => ({ ...f, mesReferencia: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Valor (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="h-10"
                placeholder="0,00"
                value={formData.valor || ""}
                onChange={(e) => setFormData((f) => ({ ...f, valor: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data vencimento
              </label>
              <Input
                className="h-10"
                placeholder="DD/MM/AAAA"
                value={formData.dataVencimento}
                onChange={(e) => {
                  const masked = maskDate(e.target.value);
                  setFormData((f) => ({ ...f, dataVencimento: masked }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Forma de pagamento
              </label>
              <Select
                value={formData.formaPagamento}
                onValueChange={(v) => setFormData((f) => ({ ...f, formaPagamento: v }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Sem forma</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t border-border mt-6 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              <X className="size-4" /> Cancelar
            </Button>
            <Button onClick={salvarForm}>{formMode === "create" ? "Criar" : "Salvar"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensalidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a mensalidade de{" "}
              <strong>{deleteTarget?.alunoNome || "—"}</strong> ({deleteTarget?.mesReferencia})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pagamentoOpen}
        onOpenChange={(o) => {
          if (!o) setPagamentoOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme o registro do pagamento e informe a forma de pagamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">
                Forma de pagamento
              </label>
              {(["pix", "dinheiro"] as const).map((v) => (
                <label
                  key={v}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    pagamentoForma === v
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="formaPagamento"
                    value={v}
                    checked={pagamentoForma === v}
                    onChange={() => setPagamentoForma(v)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm font-medium">
                    {v === "pix" ? "Pix" : "Dinheiro"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarPagamento} disabled={confirmando}>
            {confirmando ? "Processando..." : "Confirmar pagamento"}
          </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!reciboMensalidade}
        onOpenChange={(o) => {
          if (!o) setReciboMensalidade(null);
        }}
      >
        <AlertDialogContent className="max-w-lg max-h-[90dvh] flex flex-col p-4 sm:p-6">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle className="text-center text-base uppercase tracking-wide">
              Recibo de Pagamento do Associado
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto py-2 pr-1">
            {reciboMensalidade ? (
              <ReciboVisual ref={reciboRef} mensalidade={reciboMensalidade} />
            ) : null}
          </div>
          <AlertDialogFooter className="shrink-0 sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setReciboMensalidade(null)}>
              Fechar
            </Button>
            {reciboMensalidade && (
              <Button onClick={() => baixarPng(reciboMensalidade)} disabled={gerandoImg}>
                {gerandoImg ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImageDown className="size-4" />
                )}
                {gerandoImg ? "Gerando..." : "Baixar PNG"}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
