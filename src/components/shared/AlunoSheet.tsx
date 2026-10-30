import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/Primitives";
import type { Aluno } from "@/lib/mock-data";
import { turmas, anosLetivos } from "@/lib/mock-data";
import { maskCPF, maskDate, maskPhone, fmtDate } from "@/lib/format";
import { checkCpfExists, uploadFotoAluno } from "@/lib/api/alunos";
import { buscarCep, formatarCep } from "@/lib/format";
import { FotoUpload, AlunoAvatar } from "@/components/shared/FotoUpload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const schema = z.object({
  nome: z.string().min(3, "Nome muito curto").max(120),
  sexo: z.enum(["masculino", "feminino"], { message: "Selecione o sexo" }),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (000.000.000-00)")
    .or(z.literal("")),
  dataNascimento: z.string().min(1, "Obrigatório"),
  telefone: z.string().min(10, "Telefone inválido").max(20),
  email: z.string().email("E-mail inválido"),
  cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido (00000-000)"),
  logradouro: z.string().min(2, "Rua obrigatória").max(255),
  numero: z.string().min(1, "Número obrigatório").max(20),
  bairro: z.string().min(2, "Bairro obrigatório").max(255),
  cidade: z.string().min(2, "Cidade obrigatória").max(255),
  uf: z.string().regex(/^[A-Z]{2}$/, "UF inválida (ex: SP)"),
  responsavel: z.string().min(3, "Nome do responsável obrigatório"),
  cpfResponsavel: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF do responsável inválido")
    .or(z.literal("")),
  telefoneResponsavel: z.string().min(10, "Telefone do responsável inválido"),
  turma: z.string().min(1, "Selecione uma turma"),
  status: z.enum(["ativo", "inativo"]),
  valorMensalidade: z.coerce.number().min(0, "Valor inválido"),
  diaVencimento: z.coerce.number().int().min(1, "Mínimo 1").max(31, "Máximo 31"),
  anoLetivo: z.string().max(4).optional().or(z.literal("")),
  nomePai: z.string().max(120).optional().or(z.literal("")),
  nomeMae: z.string().max(120).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const viewCls =
  "w-full min-h-10 px-3 py-2.5 rounded-md bg-muted/30 border border-border text-sm text-foreground flex items-center";

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
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const emptyAluno: Aluno = {
  id: "",
  nome: "",
  sexo: "",
  cpf: "",
  dataNascimento: "",
  telefone: "",
  email: "",
  cep: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  uf: "",
  nomePai: "",
  nomeMae: "",
  responsavel: "",
  cpfResponsavel: "",
  telefoneResponsavel: "",
  turma: "",
  status: "ativo",
  valorMensalidade: 60,
  diaVencimento: 10,
  anoLetivo: "2027",
};

export function AlunoSheet({
  open,
  onOpenChange,
  aluno,
  mode,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno: Aluno | null;
  mode: "view" | "edit" | "create";
  onSave: (data: Aluno) => void | Promise<void>;
}) {
  const isCreate = mode === "create";
  const [editing, setEditing] = useState(mode === "edit" || isCreate);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(aluno?.fotoUrl || aluno?.foto || null);

  const current = aluno ?? emptyAluno;

  useEffect(() => {
    setEditing(mode === "edit" || mode === "create");
    setFotoPreview(aluno?.fotoUrl || aluno?.foto || null);
    setFotoFile(null);
  }, [aluno, mode, open]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: isCreate
      ? undefined
      : {
          ...current,
          cpf: current.cpf ? maskCPF(current.cpf) : "",
          cpfResponsavel: current.cpfResponsavel ? maskCPF(current.cpfResponsavel) : "",
          valorMensalidade: current.valorMensalidade ?? 0,
          diaVencimento: current.diaVencimento ?? 10,
          dataNascimento: current.dataNascimento?.includes("/")
            ? current.dataNascimento
            : fmtDate(current.dataNascimento),
        },
    defaultValues: isCreate ? { status: "ativo", sexo: "masculino", valorMensalidade: 60, diaVencimento: 10 } : undefined,
  });

  const onSubmit = async (data: FormData) => {
    if (isCreate) {
      const novo: Aluno = {
        id: String(Date.now()),
        ...data,
        situacao: "em_dia",
        cpf: data.cpf || "",
        cpfResponsavel: data.cpfResponsavel || "",
        foto: fotoPreview,
      };
      await onSave(novo);
      onOpenChange(false);
    } else {
      let updatedAluno: Aluno = { ...current, ...data };
      if (fotoFile) {
        try {
          const res = await uploadFotoAluno(current.id, fotoFile);
          updatedAluno = { ...updatedAluno, foto: res.foto, fotoUrl: res.fotoUrl };
        } catch {
          toast.error("Falha ao salvar foto do aluno");
        }
      } else if (!fotoPreview && current.foto) {
        updatedAluno = { ...updatedAluno, foto: null, fotoUrl: null };
      }
      await onSave(updatedAluno);
      setEditing(false);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-4 sm:p-6">
        <SheetHeader className="pr-8">
          <SheetTitle>
            {isCreate ? "Novo aluno" : editing ? "Editando aluno" : current.nome}
          </SheetTitle>
          <SheetDescription>
            {isCreate
              ? "Preencha os dados para cadastrar um novo aluno"
              : editing
                ? "Editando dados do aluno"
                : "Visualizando dados do aluno"}
          </SheetDescription>
        </SheetHeader>

        {/* Topo com Foto / Avatar */}
        <div className="flex items-center gap-4 py-4 my-2 border-y border-border">
          {editing ? (
            <FotoUpload
              value={fotoPreview}
              onChange={(file, preview) => {
                setFotoFile(file);
                setFotoPreview(preview);
              }}
              nome={current.nome || watch("nome")}
              size="md"
            />
          ) : (
            <AlunoAvatar
              foto={current.fotoUrl || current.foto}
              nome={current.nome}
              size="lg"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base truncate">{current.nome || "Novo aluno"}</h3>
            <p className="text-xs text-muted-foreground">{current.turma || "Sem turma definida"}</p>
            {current.situacao && (
              <div className="mt-1.5 flex gap-1.5">
                <StatusBadge status={current.status} />
                <StatusBadge status={current.situacao} />
              </div>
            )}
          </div>
        </div>

        <form id="aluno-sheet-form" onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-5">
          <section className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary inline-block" />
              Dados do aluno
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome completo" error={errors.nome?.message} className="sm:col-span-2">
                {editing ? (
                  <Input
                    className="h-10"
                    placeholder="Nome completo do aluno"
                    {...register("nome")}
                  />
                ) : (
                  <p className={viewCls}>{current.nome}</p>
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
                  <p className={viewCls}>
                    {current.sexo === "feminino" ? "Feminino" : current.sexo === "masculino" ? "Masculino" : "—"}
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
                        const exists = await checkCpfExists(cpf, isCreate ? undefined : current.id);
                        if (exists) {
                          setError("cpf", { message: "CPF já cadastrado" });
                        } else {
                          clearErrors("cpf");
                        }
                      }
                    }}
                  />
                ) : (
                  <p className={viewCls}>{current.cpf ? maskCPF(current.cpf) : ""}</p>
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
                  <p className={viewCls}>
                    {current.dataNascimento ? fmtDate(current.dataNascimento) : ""}
                  </p>
                )}
              </Field>
              <Field label="Telefone" error={errors.telefone?.message}>
                {editing ? (
                  <Input
                    className="h-10"
                    placeholder="(11) 99999-9999"
                    {...register("telefone")}
                    onChange={(e) => {
                      const masked = maskPhone(e.target.value);
                      e.target.value = masked;
                      setValue("telefone", masked, { shouldValidate: true });
                    }}
                  />
                ) : (
                  <p className={viewCls}>{current.telefone ? maskPhone(current.telefone) : ""}</p>
                )}
              </Field>
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
                  <p className={viewCls}>{current.cep}</p>
                )}
              </Field>
              <Field label="UF" error={errors.uf?.message}>
                {editing ? (
                  <Input
                    className="h-10 uppercase"
                    placeholder="SP"
                    maxLength={2}
                    {...register("uf")}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
                      e.target.value = v;
                      setValue("uf", v, { shouldValidate: true });
                    }}
                  />
                ) : (
                  <p className={viewCls}>{current.uf}</p>
                )}
              </Field>
              <Field label="Logradouro (rua/avenida)" error={errors.logradouro?.message} className="sm:col-span-2">
                {editing ? (
                  <Input className="h-10" {...register("logradouro")} />
                ) : (
                  <p className={viewCls}>{current.logradouro}</p>
                )}
              </Field>
              <Field label="Número" error={errors.numero?.message}>
                {editing ? (
                  <Input className="h-10" {...register("numero")} />
                ) : (
                  <p className={viewCls}>{current.numero}</p>
                )}
              </Field>
              <Field label="Bairro" error={errors.bairro?.message}>
                {editing ? (
                  <Input className="h-10" {...register("bairro")} />
                ) : (
                  <p className={viewCls}>{current.bairro}</p>
                )}
              </Field>
              <Field label="Cidade" error={errors.cidade?.message} className="sm:col-span-2">
                {editing ? (
                  <Input className="h-10" {...register("cidade")} />
                ) : (
                  <p className={viewCls}>{current.cidade}</p>
                )}
              </Field>
              <Field label="Nome do pai" error={errors.nomePai?.message}>
                {editing ? (
                  <Input className="h-10" {...register("nomePai")} />
                ) : (
                  <p className={viewCls}>{current.nomePai || "—"}</p>
                )}
              </Field>
              <Field label="Nome da mãe" error={errors.nomeMae?.message}>
                {editing ? (
                  <Input className="h-10" {...register("nomeMae")} />
                ) : (
                  <p className={viewCls}>{current.nomeMae || "—"}</p>
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
                  <p className={viewCls}>{current.anoLetivo || "—"}</p>
                )}
              </Field>
            </div>
          </section>

          <section className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary inline-block" />
              Responsável financeiro
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Nome do responsável"
                error={errors.responsavel?.message}
                className="sm:col-span-2"
              >
                {editing ? (
                  <Input
                    className="h-10"
                    placeholder="Nome completo do responsável"
                    {...register("responsavel")}
                  />
                ) : (
                  <p className={viewCls}>{current.responsavel}</p>
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
                  <p className={viewCls}>{current.cpfResponsavel ? maskCPF(current.cpfResponsavel) : ""}</p>
                )}
              </Field>
              <Field label="Telefone do responsável" error={errors.telefoneResponsavel?.message}>
                {editing ? (
                  <Input
                    className="h-10"
                    placeholder="(11) 99999-9999"
                    {...register("telefoneResponsavel")}
                    onChange={(e) => {
                      const masked = maskPhone(e.target.value);
                      e.target.value = masked;
                      setValue("telefoneResponsavel", masked, { shouldValidate: true });
                    }}
                  />
                ) : (
                  <p className={viewCls}>{current.telefoneResponsavel ? maskPhone(current.telefoneResponsavel) : ""}</p>
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
                  <p className={viewCls}>{current.email}</p>
                )}
              </Field>
            </div>
          </section>

          <section className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary inline-block" />
              Matrícula
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Série / Turma" error={errors.turma?.message}>
                {editing ? (
                  <Controller
                    name="turma"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {turmas.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <p className={viewCls}>{current.turma}</p>
                )}
              </Field>
              <Field label="Status" error={errors.status?.message}>
                {editing ? (
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || "ativo"} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <div className={viewCls}>
                    <StatusBadge status={current.status} />
                  </div>
                )}
              </Field>
              <Field label="Valor mensalidade (R$)" error={errors.valorMensalidade?.message}>
                {editing ? (
                  <Input
                    className="h-10"
                    placeholder="0,00"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("valorMensalidade", { valueAsNumber: true })}
                  />
                ) : (
                  <p className={viewCls}>
                    {current.valorMensalidade !== null && current.valorMensalidade !== undefined
                      ? current.valorMensalidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </p>
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
                  <p className={viewCls}>Dia {current.diaVencimento}</p>
                )}
              </Field>
            </div>
          </section>
        </form>

        {editing && (
          <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t border-border mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                if (isCreate) {
                  onOpenChange(false);
                } else {
                  setEditing(false);
                }
              }}
            >
              <X className="size-4" /> Cancelar
            </Button>
            <Button type="submit" form="aluno-sheet-form" disabled={isSubmitting}>
              <Save className="size-4" />{" "}
              {isSubmitting ? "Salvando..." : isCreate ? "Cadastrar" : "Salvar"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
