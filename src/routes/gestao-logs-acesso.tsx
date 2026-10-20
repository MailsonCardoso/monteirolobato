import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  FileDown,
  Loader2,
  LogIn,
  LogOut,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/shared/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchLogsAcesso, type LogAcessoItem, type LogsAcessoFilters } from "@/lib/api/logs-acesso";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/gestao-logs-acesso")({
  component: GestaoLogsAcesso,
});

const eventoBadge: Record<string, { label: string; color: string }> = {
  login: { label: "Login", color: "bg-emerald-50 text-emerald-600" },
  login_falha: { label: "Falha de login", color: "bg-red-50 text-red-600" },
  logout: { label: "Logout", color: "bg-gray-100 text-gray-600" },
  cadastro: { label: "Cadastro", color: "bg-blue-50 text-blue-600" },
};

const motivoLabel: Record<string, string> = {
  email_nao_encontrado: "E-mail não encontrado",
  senha_invalida: "Senha inválida",
};

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("pt-BR");
}

function formatCpf(cpf: string | null): string {
  if (!cpf) return "-";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function resumoUserAgent(ua: string | null): string {
  if (!ua) return "-";
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Outro";
  const sistema = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return sistema ? `${navegador} · ${sistema}` : navegador;
}

function EventoIcon({ evento }: { evento: string }) {
  if (evento === "login") return <LogIn className="size-3.5" />;
  if (evento === "login_falha") return <ShieldAlert className="size-3.5" />;
  if (evento === "logout") return <LogOut className="size-3.5" />;
  if (evento === "cadastro") return <UserPlus className="size-3.5" />;
  return <Activity className="size-3.5" />;
}

function GestaoLogsAcesso() {
  const [filters, setFilters] = useState<LogsAcessoFilters>({
    page: 1,
    per_page: 50,
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["logs-acesso", filters],
    queryFn: () => fetchLogsAcesso(filters),
    refetchInterval: 60_000,
  });

  const setFilter = (key: keyof LogsAcessoFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const gerarPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    const rows = (data?.data ?? []).map((item: LogAcessoItem) => [
      item.nome || "-",
      formatCpf(item.cpf),
      item.email || "-",
      eventoBadge[item.evento]?.label || item.evento,
      item.motivo ? motivoLabel[item.motivo] || item.motivo : "-",
      item.ip || "-",
      resumoUserAgent(item.user_agent),
      formatDate(item.created_at),
    ]);

    doc.setFontSize(16);
    doc.text("Logs de Acesso dos Associados", 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    const infoParts: string[] = [];
    if (filters.data_inicio) infoParts.push(`De: ${filters.data_inicio}`);
    if (filters.data_fim) infoParts.push(`Até: ${filters.data_fim}`);
    if (filters.evento)
      infoParts.push(`Evento: ${eventoBadge[filters.evento]?.label || filters.evento}`);
    if (infoParts.length > 0) doc.text(infoParts.join(" | "), 14, 27);

    autoTable(doc, {
      startY: 33,
      head: [["Associado", "CPF", "E-mail", "Evento", "Motivo", "IP", "Dispositivo", "Data/Hora"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [214, 40, 40] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 28 },
        2: { cellWidth: 60 },
        3: { cellWidth: 26 },
        4: { cellWidth: 38 },
        5: { cellWidth: 30 },
        6: { cellWidth: 30 },
        7: { cellWidth: 32 },
      },
    });

    doc.save(`logs-acesso-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const resumo = data?.resumo;

  return (
    <>
      <PageHeader
        title="Logs de Acesso"
        description="Monitore os acessos dos associados ao sistema (atualiza a cada 60s)"
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={gerarPDF}>
            <FileDown className="size-3.5" />
            Exportar PDF
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Acessos registrados"
          value={resumo?.total ?? 0}
          icon={<Activity className="size-5" />}
          tone="info"
          trend={
            resumo?.ultimo_acesso ? `Último: ${formatDate(resumo.ultimo_acesso)}` : "Nenhum acesso"
          }
        />
        <StatCard
          label="Logins realizados"
          value={resumo?.logins ?? 0}
          icon={<LogIn className="size-5" />}
          tone="success"
          trend="Autenticações bem-sucedidas"
        />
        <StatCard
          label="Tentativas falhas"
          value={resumo?.falhas ?? 0}
          icon={<ShieldAlert className="size-5" />}
          tone="destructive"
          trend="Senha ou e-mail inválidos"
        />
        <StatCard
          label="Associados monitorados"
          value={resumo?.associados ?? 0}
          icon={<Users className="size-5" />}
          tone="default"
          trend="Associados distintos no período"
        />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou CPF..."
                className="pl-9 h-9 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setFilter("search", searchInput);
                  }
                }}
              />
            </div>
            <Input
              type="date"
              className="h-9 w-[160px] text-sm"
              value={filters.data_inicio || ""}
              onChange={(e) => setFilter("data_inicio", e.target.value)}
              title="Data inicial"
            />
            <Input
              type="date"
              className="h-9 w-[160px] text-sm"
              value={filters.data_fim || ""}
              onChange={(e) => setFilter("data_fim", e.target.value)}
              title="Data final"
            />
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground"
              value={filters.evento || ""}
              onChange={(e) => setFilter("evento", e.target.value)}
            >
              <option value="">Todos os eventos</option>
              {Object.entries(eventoBadge).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setFilters({ page: 1, per_page: 50 });
                setSearchInput("");
              }}
            >
              Limpar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.data.length ? (
          <EmptyState
            title="Nenhum acesso registrado"
            description="Os acessos dos associados aparecerão aqui assim que forem registrados."
            icon={<Activity className="size-6" />}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs text-muted-foreground">
              <span>{data.total} registro(s)</span>
              <span>
                Página {data.current_page} de {Math.max(data.last_page, 1)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Associado
                    </th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      E-mail
                    </th>
                    <th className="text-center py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      IP
                    </th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Dispositivo
                    </th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                      Data/Hora
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((item: LogAcessoItem) => {
                    const badge = eventoBadge[item.evento] || {
                      label: item.evento,
                      color: "bg-gray-50 text-gray-500",
                    };
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors border-b border-border/50"
                      >
                        <td
                          className="py-3 px-3 font-medium text-foreground max-w-[200px] truncate"
                          title={item.nome || ""}
                        >
                          {item.nome || "-"}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                          {formatCpf(item.cpf)}
                        </td>
                        <td
                          className="py-3 px-3 text-muted-foreground max-w-[220px] truncate"
                          title={item.email || ""}
                        >
                          {item.email || "-"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.color}`}
                            >
                              <EventoIcon evento={item.evento} />
                              {badge.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {item.motivo ? motivoLabel[item.motivo] || item.motivo : "-"}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {item.ip || "-"}
                        </td>
                        <td
                          className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap"
                          title={item.user_agent || ""}
                        >
                          {resumoUserAgent(item.user_agent)}
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(item.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Página {data.current_page} de {data.last_page}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={data.current_page <= 1}
                    onClick={() => goToPage(data.current_page - 1)}
                  >
                    <ArrowLeft className="size-3.5" />
                  </Button>
                  {Array.from({ length: Math.min(data.last_page, 5) }, (_, i) => {
                    const start = Math.max(1, data.current_page - 2);
                    const page = start + i;
                    if (page > data.last_page) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === data.current_page ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 text-xs"
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={data.current_page >= data.last_page}
                    onClick={() => goToPage(data.current_page + 1)}
                  >
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
