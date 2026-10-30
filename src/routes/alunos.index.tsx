import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  LayoutGrid,
  List,
  User,
  Phone,
} from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared/Primitives";
import { AlunoSheet } from "@/components/shared/AlunoSheet";
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { turmas, anosLetivos } from "@/lib/mock-data";
import type { Aluno } from "@/lib/mock-data";
import { toast } from "sonner";
import { fetchAlunos, createAluno, updateAluno, deleteAluno } from "@/lib/api/alunos";
import { cadastrarAssociado } from "@/lib/api/associado";
import { AlunoAvatar } from "@/components/shared/FotoUpload";
import { maskPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alunos/")({
  component: AlunosList,
});

function AlunosList() {
  const [data, setData] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [turma, setTurma] = useState("all");
  const [anoFilter, setAnoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [sheetAluno, setSheetAluno] = useState<Aluno | null>(null);
  const [sheetMode, setSheetMode] = useState<"view" | "edit" | "create">("view");
  const [deleteTarget, setDeleteTarget] = useState<Aluno | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);

  useEffect(() => {
    fetchAlunos()
      .then(setData)
      .catch(() => toast.error("Erro ao carregar alunos"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      data.filter(
        (a) =>
          (!q ||
            a.nome.toLowerCase().includes(q.toLowerCase()) ||
            a.responsavel.toLowerCase().includes(q.toLowerCase())) &&
          (turma === "all" || a.turma === turma) &&
          (statusFilter === "all" || a.status === statusFilter) &&
          (anoFilter === "all" || a.anoLetivo === anoFilter),
      ),
    [data, q, turma, statusFilter, anoFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page, perPage],
  );

  useEffect(() => {
    setPage(1);
  }, [q, turma, statusFilter, anoFilter]);

  const handleSave = async (aluno: Aluno) => {
    try {
      if (sheetMode === "create") {
        const created = await createAluno(aluno);
        setData((d) => [...d, created]);

        const cpfLimpo = (aluno.cpfResponsavel || "").replace(/\D/g, "");
        if (aluno.responsavel && cpfLimpo) {
          try {
            await cadastrarAssociado({
              nome: aluno.responsavel,
              cpf: cpfLimpo,
              email: aluno.email,
              telefone: aluno.telefoneResponsavel,
              nome_aluno: aluno.nome,
              password: cpfLimpo,
            });
            toast.success("Aluno e responsável cadastrados com sucesso!");
          } catch (assocErr: unknown) {
            const apiErr = assocErr as {
              response?: { data?: { message?: string; errors?: Record<string, string[]> } };
            };
            const assocMsg =
              apiErr.response?.data?.message ||
              apiErr.response?.data?.errors?.cpf?.[0] ||
              apiErr.response?.data?.errors?.email?.[0] ||
              "erro desconhecido";
            console.error("Erro ao criar associado:", assocErr);
            toast.error(
              `Aluno criado, mas falha ao cadastrar responsável como associado: ${assocMsg}`,
            );
          }
        } else {
          toast.warning(
            "Aluno cadastrado, mas responsável não virou associado: informe o CPF do responsável.",
          );
        }

        setSheetAluno(null);
        setSheetMode("view");
      } else {
        const updated = await updateAluno(aluno.id, aluno);
        setData((d) => d.map((a) => (a.id === updated.id ? updated : a)));
        toast.success("Aluno atualizado com sucesso!");
        setSheetAluno(updated);
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      const msg = apiErr.response?.data?.errors?.cpf?.[0] || "Erro ao salvar aluno";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAluno(deleteTarget.id);
      setData((d) => d.filter((a) => a.id !== deleteTarget.id));
      toast.success("Aluno removido");
      setDeleteTarget(null);
    } catch {
      toast.error("Erro ao excluir aluno");
    }
  };

  return (
    <>
      <PageHeader
        title="Alunos"
        description={`${filtered.length} aluno(s) encontrado(s)`}
        actions={
          <div className="flex items-center gap-2">
            {/* Seletor de Modo: Cards ou Tabela */}
            <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
                  viewMode === "cards"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Visualização em Cards"
              >
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
                  viewMode === "table"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Visualização em Tabela"
              >
                <List className="size-4" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
            </div>

            <Button
              onClick={() => {
                setSheetAluno(null);
                setSheetMode("create");
              }}
            >
              <Plus className="size-4" /> Novo aluno
            </Button>
          </div>
        }
      />

      <div className="bg-card rounded-xl border border-border">
        {/* Barra de Filtros */}
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
          <Select value={anoFilter} onValueChange={setAnoFilter}>
            <SelectTrigger className="w-36 h-10">
              <SelectValue placeholder="Ano letivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {anosLetivos.map((ano) => (
                <SelectItem key={ano} value={ano}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conteúdo: Cards ou Tabela */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Nenhum aluno encontrado"
                description="Ajuste os filtros ou cadastre um novo aluno."
              />
            </div>
          ) : viewMode === "cards" ? (
            /* Visualização em CARDS com Fotos em Destaque */
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {paged.map((a) => (
                <div
                  key={a.id}
                  className="bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Topo do Card com Foto e Status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <AlunoAvatar
                        foto={a.fotoUrl || a.foto}
                        nome={a.nome}
                        size="lg"
                        className="transition-transform group-hover:scale-105"
                      />
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={a.status} />
                        {a.situacao && <StatusBadge status={a.situacao} />}
                      </div>
                    </div>

                    {/* Nome do Aluno */}
                    <Link
                      to="/alunos/$id"
                      params={{ id: a.id }}
                      className="block font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1"
                      title={a.nome}
                    >
                      {a.nome}
                    </Link>

                    {/* Turma e Ano Letivo */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/90">{a.turma}</span>
                      {a.anoLetivo && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground">
                          {a.anoLetivo}
                        </span>
                      )}
                    </div>

                    {/* Dados de Contato e Responsável */}
                    <div className="mt-3.5 pt-3 border-t border-border/60 text-xs text-muted-foreground space-y-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <User className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate" title={a.responsavel}>
                          {a.responsavel}
                        </span>
                      </div>
                      {a.telefoneResponsavel && (
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span>{maskPhone(a.telefoneResponsavel)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé com Ações */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Link
                      to="/alunos/$id"
                      params={{ id: a.id }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Ficha do aluno →
                    </Link>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSheetAluno(a);
                          setSheetMode("view");
                        }}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Visualização rápida"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSheetAluno(a);
                          setSheetMode("edit");
                        }}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Visualização em TABELA tradicional com Miniatura da Foto */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Aluno</th>
                    <th className="px-4 py-3 font-medium">Responsável</th>
                    <th className="px-4 py-3 font-medium">Turma</th>
                    <th className="px-4 py-3 font-medium">Ano</th>
                    <th className="px-4 py-3 font-medium">Telefone</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <AlunoAvatar foto={a.fotoUrl || a.foto} nome={a.nome} size="sm" />
                          <Link
                            to="/alunos/$id"
                            params={{ id: a.id }}
                            className="hover:underline hover:text-primary font-semibold"
                          >
                            {a.nome}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.responsavel}</td>
                      <td className="px-4 py-3">{a.turma}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                          {a.anoLetivo || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {maskPhone(a.telefoneResponsavel)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSheetAluno(a);
                              setSheetMode("view");
                            }}
                            className="p-1.5 rounded hover:bg-accent"
                            title="Visualizar"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSheetAluno(a);
                              setSheetMode("edit");
                            }}
                            className="p-1.5 rounded hover:bg-accent"
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginação */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Exibindo {(page - 1) * perPage + 1}-
                {Math.min(page * perPage, filtered.length)} de {filtered.length}
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
                  {[12, 24, 48, 96].map((n) => (
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

      <AlunoSheet
        key={sheetMode + (sheetAluno?.id ?? "new")}
        open={!!sheetAluno || sheetMode === "create"}
        onOpenChange={(open) => {
          if (!open) {
            setSheetAluno(null);
            setSheetMode("view");
          }
        }}
        aluno={sheetAluno}
        mode={sheetMode}
        onSave={handleSave}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
