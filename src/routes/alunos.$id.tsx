import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { PageHeader, StatusBadge } from "@/components/shared/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { turmas, anosLetivos } from "@/lib/mock-data";
import type { Aluno } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { maskCPF, maskDate, maskPhone, fmtDate, brl, formatarCep, buscarCep } from "@/lib/format";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { fetchAluno, updateAluno, deleteAluno, checkCpfExists, uploadFotoAluno } from "@/lib/api/alunos";
import { FotoUpload, AlunoAvatar } from "@/components/shared/FotoUpload";
import api from "@/lib/api";

export const Route = createFileRoute("/alunos/$id")({
  component: AlunoDetalhe,
});

const schema = z.object({
  nome: z.string().min(3, "Nome muito curto").max(120),
  sexo: z.enum(["masculino", "feminino"], { message: "Selecione o sexo" }),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (000.000.000-00)"),
  dataNascimento: z.string().min(1, "Obrigatório"),
  telefone: z.string().min(10, "Telefone inválido").max(20),
  email: z.string().email("E-mail inválido"),
  cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido (00000-000)"),
  logradouro: z.string().min(2, "Rua obrigatória").max(255),
  numero: z.string().min(1, "Número obrigatório").max(20),
  bairro: z.string().min(2, "Bairro obrigatório").max(255),
  cidade: z.string().min(2, "Cidade obrigatória").max(255),
  uf: z.string().regex(/^[A-Z]{2}$/, "UF inválida (ex: SP)"),
  nomePai: z.string().max(120).optional().or(z.literal("")),
  nomeMae: z.string().max(120).optional().or(z.literal("")),
  responsavel: z.string().min(3, "Nome do responsável obrigatório"),
  cpfResponsavel: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF do responsável inválido"),
  telefoneResponsavel: z.string().min(10, "Telefone do responsável inválido"),
  turma: z.string().min(1, "Selecione uma turma"),
  status: z.enum(["ativo", "inativo"]),
  valorMensalidade: z.coerce.number().min(0, "Valor inválido"),
  diaVencimento: z.coerce.number().int().min(1, "Mínimo 1").max(31, "Máximo 31"),
  anoLetivo: z.string().max(4).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AlunoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aluno, setAluno] = useState<Aluno | undefined>();
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoRemovida, setFotoRemovida] = useState(false);

  useEffect(() => {
    fetchAluno(id)
      .then((data) => {
        setAluno(data);
        setFotoPreview(data.fotoUrl || data.foto || null);
        setFotoFile(null);
        setFotoRemovida(false);
      })
      .catch(() => toast.error("Erro ao carregar aluno"))
      .finally(() => setLoading(false));
  }, [id]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: aluno
      ? {
          ...aluno,
          cpf: aluno.cpf ? maskCPF(aluno.cpf) : "",
          cpfResponsavel: aluno.cpfResponsavel ? maskCPF(aluno.cpfResponsavel) : "",
          dataNascimento: aluno.dataNascimento?.includes("/")
            ? aluno.dataNascimento
            : fmtDate(aluno.dataNascimento),
          valorMensalidade: aluno.valorMensalidade ?? 0,
          diaVencimento: aluno.diaVencimento ?? 10,
        }
      : undefined,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg">Aluno não encontrado</p>
        <Link to="/alunos" className="text-primary hover:underline text-sm mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    try {
      const payload: Partial<Aluno> & { remover_foto?: boolean } = { ...data };
      if (fotoRemovida) {
        payload.remover_foto = true;
      }
      let updated = await updateAluno(aluno.id, payload);

      if (fotoFile) {
        try {
          const fotoRes = await uploadFotoAluno(aluno.id, fotoFile);
          updated = { ...updated, foto: fotoRes.foto, fotoUrl: fotoRes.fotoUrl };
          setFotoPreview(fotoRes.fotoUrl);
          setFotoFile(null);
          setFotoRemovida(false);
        } catch {
          toast.error("Dados atualizados, mas ocorreu uma falha ao enviar foto.");
        }
      }

      setAluno(updated);
      setEditing(false);
      toast.success("Aluno atualizado com sucesso!");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      const msg = apiErr.response?.data?.errors?.cpf?.[0] || "Erro ao atualizar aluno";
      toast.error(msg);
    }
  };

  const remover = async () => {
    try {
      await deleteAluno(aluno.id);
      toast.success("Aluno removido");
      navigate({ to: "/alunos" });
    } catch {
      toast.error("Erro ao excluir aluno");
    }
  };

  const handleCepBlur = async (value: string) => {
    const cepFormatado = formatarCep(value);
    if (cepFormatado.length !== 9) return;

    const endereco = await buscarCep(cepFormatado);
    if (endereco) {
      setValue("uf", endereco.uf.toUpperCase(), { shouldValidate: true });
      setValue("cidade", endereco.localidade, { shouldValidate: true });
      setValue("bairro", endereco.bairro, { shouldValidate: true });
      setValue("logradouro", endereco.logradouro, { shouldValidate: true });
    }
  };

  return (
    <>
      <PageHeader
        title={aluno.nome}
        description={`${aluno.turma} · ${aluno.situacao === "em_dia" ? "Em dia" : aluno.situacao === "em_atraso" ? "Em atraso" : "Inadimplente"}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/alunos">
              <Button variant="outline">
                <ArrowLeft className="size-4" /> Voltar
              </Button>
            </Link>
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    reset();
                    setFotoPreview(aluno.fotoUrl || aluno.foto || null);
                    setFotoFile(null);
                    setFotoRemovida(false);
                    setEditing(false);
                  }}
                >
                  <X className="size-4" /> Cancelar
                </Button>
                <Button type="submit" form="aluno-form" disabled={isSubmitting}>
                  <Save className="size-4" /> {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-destructive/30 hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="size-4" /> Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir aluno</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir <strong>{aluno.nome}</strong>? Esta ação não
                        pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={remover}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sim, excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        }
      />

      {/* Cartão de Destaque / Foto do Aluno */}
      <div className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row items-center gap-6 mb-6">
        {editing ? (
          <FotoUpload
            value={fotoPreview}
            onChange={(file, preview) => {
              setFotoFile(file);
              setFotoPreview(preview);
              setFotoRemovida(file === null && preview === null);
            }}
            nome={aluno.nome}
            size="lg"
          />
        ) : (
          <AlunoAvatar
            foto={aluno.fotoUrl || aluno.foto}
            nome={aluno.nome}
            size="xl"
          />
        )}
        <div className="text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl font-bold truncate">{aluno.nome}</h2>
            <StatusBadge status={aluno.status} />
            <StatusBadge status={aluno.situacao} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {aluno.turma} {aluno.anoLetivo ? `· Ano ${aluno.anoLetivo}` : ""} · Responsável: {aluno.responsavel}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
              Vencimento: dia {aluno.diaVencimento || 10}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
              Mensalidade: {brl(aluno.valorMensalidade || 0)}
            </span>
            {aluno.telefoneResponsavel && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                Tel: {maskPhone(aluno.telefoneResponsavel)}
              </span>
            )}
          </div>
        </div>
      </div>

      <form
        id="aluno-form"
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card rounded-xl border border-border p-6 space-y-6"
      >
        <section>
          <h3 className="font-semibold mb-4">Dados do aluno</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome completo" error={errors.nome?.message} className="md:col-span-2">
              {editing ? (
                <Input className="h-10" {...register("nome")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.nome}</p>
              )}
            </Field>
            <Field label="Sexo" error={errors.sexo?.message}>
              {editing ? (
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                  {...register("sexo")}
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              ) : (
                <p className="text-sm py-2.5">
                  {aluno.sexo === "feminino"
                    ? "Feminino"
                    : aluno.sexo === "masculino"
                      ? "Masculino"
                      : aluno.sexo}
                </p>
              )}
            </Field>
            <Field label="CPF" error={errors.cpf?.message}>
              {editing ? (
                <Input
                  className="h-10"
                  placeholder="000.000.000-00"
                  {...register("cpf")}
                  onChange={(e) => {
                    const masked = maskCPF(e.target.value);
                    e.target.value = masked;
                    setValue("cpf", masked, { shouldValidate: true });
                  }}
                  onBlur={async (e) => {
                    const cpf = e.target.value;
                    if (cpf.match(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)) {
                      const exists = await checkCpfExists(cpf, aluno.id);
                      if (exists) {
                        setError("cpf", { message: "CPF já cadastrado" });
                      } else {
                        clearErrors("cpf");
                      }
                    }
                  }}
                />
              ) : (
                <p className="text-sm py-2.5">{maskCPF(aluno.cpf)}</p>
              )}
            </Field>
            <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
              {editing ? (
                <Input
                  className="h-10"
                  placeholder="DD/MM/AAAA"
                  {...register("dataNascimento")}
                  onChange={(e) => {
                    const masked = maskDate(e.target.value);
                    e.target.value = masked;
                    setValue("dataNascimento", masked, { shouldValidate: true });
                  }}
                />
              ) : (
                <p className="text-sm py-2.5">{fmtDate(aluno.dataNascimento)}</p>
              )}
            </Field>
            <Field label="Telefone" error={errors.telefone?.message}>
              {editing ? (
                <Input
                  className="h-10"
                  placeholder="(00) 00000-0000"
                  {...register("telefone")}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    e.target.value = masked;
                    setValue("telefone", masked, { shouldValidate: true });
                  }}
                />
              ) : (
                <p className="text-sm py-2.5">{maskPhone(aluno.telefone)}</p>
              )}
            </Field>
            <Field label="E-mail" error={errors.email?.message} className="md:col-span-2">
              {editing ? (
                <Input type="email" className="h-10" {...register("email")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.email}</p>
              )}
            </Field>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-4">Filiação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome da mãe" error={errors.nomeMae?.message}>
              {editing ? (
                <Input className="h-10" placeholder="Nome completo da mãe" {...register("nomeMae")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.nomeMae || "—"}</p>
              )}
            </Field>
            <Field label="Nome do pai" error={errors.nomePai?.message}>
              {editing ? (
                <Input className="h-10" placeholder="Nome completo do pai" {...register("nomePai")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.nomePai || "—"}</p>
              )}
            </Field>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-4">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="CEP" error={errors.cep?.message}>
              {editing ? (
                <Input
                  className="h-10"
                  placeholder="00000-000"
                  {...register("cep")}
                  onChange={(e) => {
                    const masked = formatarCep(e.target.value);
                    e.target.value = masked;
                    setValue("cep", masked, { shouldValidate: true });
                  }}
                  onBlur={(e) => handleCepBlur(e.target.value)}
                />
              ) : (
                <p className="text-sm py-2.5">{aluno.cep}</p>
              )}
            </Field>
            <Field label="Logradouro / Rua" error={errors.logradouro?.message} className="md:col-span-2">
              {editing ? (
                <Input className="h-10" {...register("logradouro")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.logradouro}</p>
              )}
            </Field>
            <Field label="Número" error={errors.numero?.message}>
              {editing ? (
                <Input className="h-10" {...register("numero")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.numero}</p>
              )}
            </Field>
            <Field label="Bairro" error={errors.bairro?.message}>
              {editing ? (
                <Input className="h-10" {...register("bairro")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.bairro}</p>
              )}
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Cidade" error={errors.cidade?.message} className="col-span-2">
                {editing ? (
                  <Input className="h-10" {...register("cidade")} />
                ) : (
                  <p className="text-sm py-2.5">{aluno.cidade}</p>
                )}
              </Field>
              <Field label="UF" error={errors.uf?.message}>
                {editing ? (
                  <Input
                    className="h-10"
                    maxLength={2}
                    placeholder="UF"
                    {...register("uf")}
                    onChange={(e) => {
                      const upper = e.target.value.toUpperCase();
                      e.target.value = upper;
                      setValue("uf", upper, { shouldValidate: true });
                    }}
                  />
                ) : (
                  <p className="text-sm py-2.5">{aluno.uf}</p>
                )}
              </Field>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-4">Responsável financeiro</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do responsável" error={errors.responsavel?.message}>
              {editing ? (
                <Input className="h-10" {...register("responsavel")} />
              ) : (
                <p className="text-sm py-2.5">{aluno.responsavel}</p>
              )}
            </Field>
            <Field label="CPF do responsável" error={errors.cpfResponsavel?.message}>
              {editing ? (
                <Input
                  className="h-10"
                  placeholder="000.000.000-00"
                  {...register("cpfResponsavel")}
                  onChange={(e) => {
                    const masked = maskCPF(e.target.value);
                    e.target.value = masked;
                    setValue("cpfResponsavel", masked, { shouldValidate: true });
                  }}
                />
              ) : (
                <p className="text-sm py-2.5">{maskCPF(aluno.cpfResponsavel)}</p>
              )}
            </Field>
            <Field label="Telefone do responsável" error={errors.telefoneResponsavel?.message}>
              {editing ? (
                <Input
                  className="h-10"
                  placeholder="(00) 00000-0000"
                  {...register("telefoneResponsavel")}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value);
                    e.target.value = masked;
                    setValue("telefoneResponsavel", masked, { shouldValidate: true });
                  }}
                />
              ) : (
                <p className="text-sm py-2.5">{maskPhone(aluno.telefoneResponsavel)}</p>
              )}
            </Field>
            <Field label="E-mail do responsável" error={errors.email?.message}>
              {editing ? (
                <Input
                  type="email"
                  className="h-10"
                  placeholder="usado para login no portal"
                  {...register("email")}
                />
              ) : (
                <p className="text-sm py-2.5">{aluno.email}</p>
              )}
            </Field>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-4">Matrícula</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Série / Turma" error={errors.turma?.message}>
              {editing ? (
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                  {...register("turma")}
                >
                  {turmas.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm py-2.5">{aluno.turma}</p>
              )}
            </Field>
            <Field label="Status" error={errors.status?.message}>
              {editing ? (
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                  {...register("status")}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              ) : (
                <StatusBadge status={aluno.status} />
              )}
            </Field>
            <Field label="Situação financeira">
              <StatusBadge status={aluno.situacao} />
            </Field>
            <Field label="Valor mensalidade (R$)" error={errors.valorMensalidade?.message}>
              {editing ? (
                <Controller
                  name="valorMensalidade"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      className="h-10"
                      value={field.value ?? 0}
                      onChange={field.onChange}
                    />
                  )}
                />
              ) : (
                <p className="text-sm py-2.5">{brl(aluno.valorMensalidade || 0)}</p>
              )}
            </Field>
            <Field label="Dia vencimento" error={errors.diaVencimento?.message}>
              {editing ? (
                <Controller
                  name="diaVencimento"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      className="h-10"
                      placeholder="10"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(Number(e.target.value) || 10)}
                    />
                  )}
                />
              ) : (
                <p className="text-sm py-2.5">{aluno.diaVencimento || 10}</p>
              )}
            </Field>
            <Field label="Ano letivo" error={errors.anoLetivo?.message}>
              {editing ? (
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                  {...register("anoLetivo")}
                >
                  <option value="">Selecione...</option>
                  {anosLetivos.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm py-2.5">{aluno.anoLetivo || "—"}</p>
              )}
            </Field>
          </div>
        </section>
      </form>

      <ExtratoFinanceiro alunoId={aluno.id} />
    </>
  );
}

interface MensalidadeExtrato {
  id: string;
  mes_referencia: string;
  data_vencimento: string;
  valor: number | string;
  status: string;
  data_pagamento?: string;
}

function ExtratoFinanceiro({ alunoId }: { alunoId: string }) {
  const [data, setData] = useState<{
    mensalidades: MensalidadeExtrato[];
    total_pago: number;
    total_pendente: number;
    qtd_pagas: number;
    qtd_pendentes: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/alunos/${alunoId}/extrato`)
      .then((r) => {
        setData(r.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [alunoId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!data) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Extrato financeiro</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total pago</p>
          <p className="text-lg font-semibold mt-1 text-success">{brl(data.total_pago)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total pendente</p>
          <p className="text-lg font-semibold mt-1 text-warning">{brl(data.total_pendente)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagas</p>
          <p className="text-lg font-semibold mt-1">{data.qtd_pagas}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
          <p className="text-lg font-semibold mt-1">{data.qtd_pendentes}</p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Mês</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.mensalidades.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{m.mes_referencia}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(m.data_vencimento)}</td>
                <td className="px-4 py-3">{brl(Number(m.valor))}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {m.data_pagamento ? fmtDate(m.data_pagamento) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
