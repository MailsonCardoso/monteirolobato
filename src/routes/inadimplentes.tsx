import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, DollarSign, Loader2, MessageCircle, Search } from "lucide-react";
import { PageHeader, StatusBadge, StatCard, EmptyState } from "@/components/shared/Primitives";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { turmas } from "@/lib/mock-data";
import type { Aluno, Mensalidade } from "@/lib/mock-data";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { fetchAlunos } from "@/lib/api/alunos";
import { fetchMensalidades, verificarVencidas } from "@/lib/api/mensalidades";

export const Route = createFileRoute("/inadimplentes")({
  component: Inadimplentes,
});

function Inadimplentes() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [turma, setTurma] = useState("all");

  const carregar = useCallback(async () => {
    try {
      await verificarVencidas();
      const [a, m] = await Promise.all([fetchAlunos(), fetchMensalidades()]);
      setAlunos(a);
      setMensalidades(m);
    } catch {
      toast.error("Erro ao carregar dados");
    }
  }, []);

  useEffect(() => {
    carregar().finally(() => setLoading(false));
  }, [carregar]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) carregar(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [carregar]);

  const inadimplentes = useMemo(
    () =>
      alunos.filter(
        (a) =>
          (a.situacao === "inadimplente" || a.situacao === "em_atraso") &&
          (!q ||
            a.nome.toLowerCase().includes(q.toLowerCase()) ||
            a.responsavel.toLowerCase().includes(q.toLowerCase())) &&
          (turma === "all" || a.turma === turma),
      ),
    [alunos, q, turma],
  );

  const agregado = useMemo(() => {
    const hoje = new Date();
    const mapa = new Map<string, { parcelas: number; maiorAtraso: number; total: number }>();

    for (const m of mensalidades) {
      if (m.status !== "pendente" && m.status !== "atrasado") continue;
      const venc = new Date(m.dataVencimento.split("/").reverse().join("-"));
      const atraso = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)));
      const existente = mapa.get(m.alunoId);
      if (existente) {
        existente.parcelas += 1;
        existente.total += m.valor;
        if (atraso > existente.maiorAtraso) existente.maiorAtraso = atraso;
      } else {
        mapa.set(m.alunoId, { parcelas: 1, maiorAtraso: atraso, total: m.valor });
      }
    }
    return mapa;
  }, [mensalidades]);

  const totalDevido = useMemo(
    () => inadimplentes.reduce((acc, a) => acc + (agregado.get(a.id)?.total ?? 0), 0),
    [inadimplentes, agregado],
  );
  const maiorAtraso = useMemo(
    () => Math.max(0, ...inadimplentes.map((a) => agregado.get(a.id)?.maiorAtraso ?? 0)),
    [inadimplentes, agregado],
  );

  return (
    <>
      <PageHeader
        title="Inadimplentes"
        description={`${inadimplentes.length} aluno(s) com atraso ou inadimplência`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total com atraso/inadimplência"
          value={inadimplentes.length}
          icon={<AlertTriangle className="size-5" />}
          tone="destructive"
        />
        <StatCard
          label="Valor total devido"
          value={brl(totalDevido)}
          icon={<DollarSign className="size-5" />}
          tone="warning"
        />
        <StatCard
          label="Maior atraso"
          value={`${maiorAtraso}d`}
          icon={<Clock className="size-5" />}
          tone="info"
        />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou responsável..."
              className="pl-9 h-10"
            />
          </div>
          <Select value={turma} onValueChange={setTurma}>
            <SelectTrigger className="w-44 h-10">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : inadimplentes.length === 0 ? (
            <EmptyState
              title="Nenhum inadimplente"
              description="Todos os alunos estão com a situação financeira em dia!"
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Turma</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 font-medium text-center">Parcelas em atraso</th>
                  <th className="px-4 py-3 font-medium text-center">Dias em atraso</th>
                  <th className="px-4 py-3 font-medium text-right">Valor devido</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inadimplentes.map((a) => {
                  const det = agregado.get(a.id);
                  return (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{a.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.responsavel}</td>
                      <td className="px-4 py-3">{a.turma}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.situacao} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {det ? (
                          <span className="inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">
                            {det.parcelas}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-destructive font-medium">
                        {det ? `${det.maiorAtraso}d` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-destructive">
                        {det ? brl(det.total) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            const phone = a.telefoneResponsavel?.replace(/\D/g, "") || a.telefone?.replace(/\D/g, "");
                            if (!phone) { toast.error("Telefone não encontrado"); return; }
                            const msg = encodeURIComponent(
                              `Olá! ${a.responsavel || "Responsável"}\n\nLembramos que você possui ${det?.parcelas || 0} fatura(s) em aberto referente ao ${a.sexo === "feminino" ? "aluna" : "aluno"} ${a.nome}, totalizando ${det ? brl(det.total) : "—"}, abaixo o resumo. Caso já tenha pago, desconsidere esta mensagem.\n\nResumo:\n• Mensalidade(s) em aberto: ${det?.parcelas || 0}\n• Valor total: ${det ? brl(det.total) : "—"}\n• Maior atraso: ${det?.maiorAtraso || 0} dias\n\nQualquer dúvida, estamos à disposição!\n\nAtenciosamente,\n2 de Julho — Unidade XLI — Monteiro Lobato`,
                            );
                            window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
                          }}
                          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Cobrar via WhatsApp"
                        >
                          <MessageCircle className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </>
  );
}
