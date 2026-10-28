import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/Primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { turmas, anosLetivos } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { maskCPF, maskDate, maskPhone, formatarCep, buscarCep } from "@/lib/format";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { createAluno, checkCpfExists } from "@/lib/api/alunos";
import { cadastrarAssociado } from "@/lib/api/associado";

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

export const Route = createFileRoute("/alunos/novo")({
  component: NovoAluno,
});

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

function NovoAluno() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "ativo",
      sexo: "masculino",
      valorMensalidade: 60 as number,
      diaVencimento: 10,
      anoLetivo: "2027",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createAluno({ ...data, situacao: "em_dia" });

      const cpfLimpo = data.cpfResponsavel.replace(/\D/g, "");
      try {
        await cadastrarAssociado({
          nome: data.responsavel,
          cpf: cpfLimpo,
          email: data.email,
          telefone: data.telefoneResponsavel,
          nome_aluno: data.nome,
          password: cpfLimpo,
        });
      } catch (assocErr: unknown) {
        const apiErr = assocErr as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
        const assocMsg = apiErr.response?.data?.message
          || apiErr.response?.data?.errors?.cpf?.[0]
          || apiErr.response?.data?.errors?.email?.[0]
          || "Erro ao cadastrar responsável como associado";
        console.error("Erro ao criar associado:", assocErr);
        toast.error(assocMsg);
        return;
      }

      toast.success("Aluno e responsável cadastrados com sucesso!");
      navigate({ to: "/alunos" });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      const msg = apiErr.response?.data?.errors?.cpf?.[0] || "Erro ao cadastrar aluno";
      toast.error(msg);
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
        title="Cadastro de aluno"
        description="Preencha os dados do aluno e do responsável financeiro"
        actions={
          <Link
            to="/alunos"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-input hover:bg-accent text-sm"
          >
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card rounded-xl border border-border p-6 space-y-6"
      >
        <section>
          <h3 className="font-semibold mb-4">Dados do aluno</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome completo" error={errors.nome?.message} className="md:col-span-2">
              <Input className="h-10" {...register("nome")} />
            </Field>
            <Field label="Sexo" error={errors.sexo?.message}>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                {...register("sexo")}
              >
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </Field>
            <Field label="CPF" error={errors.cpf?.message}>
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
                    const exists = await checkCpfExists(cpf);
                    if (exists) {
                      setError("cpf", { message: "CPF já cadastrado" });
                    } else {
                      clearErrors("cpf");
                    }
                  }
                }}
              />
            </Field>
            <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
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
            </Field>
            <Field label="Telefone" error={errors.telefone?.message}>
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
            </Field>
            <Field label="CEP" error={errors.cep?.message}>
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
            </Field>
            <Field label="UF" error={errors.uf?.message}>
              <Input
                className="h-10 uppercase"
                placeholder="SP"
                maxLength={2}
                {...register("uf")}
                onChange={(e) => {
                  const v = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z]/g, "")
                    .slice(0, 2);
                  e.target.value = v;
                  setValue("uf", v, { shouldValidate: true });
                }}
              />
            </Field>
            <Field
              label="Logradouro (rua/avenida)"
              error={errors.logradouro?.message}
              className="md:col-span-2"
            >
              <Input className="h-10" {...register("logradouro")} />
            </Field>
            <Field label="Número" error={errors.numero?.message}>
              <Input className="h-10" {...register("numero")} />
            </Field>
            <Field label="Bairro" error={errors.bairro?.message}>
              <Input className="h-10" {...register("bairro")} />
            </Field>
            <Field label="Cidade" error={errors.cidade?.message} className="md:col-span-2">
              <Input className="h-10" {...register("cidade")} />
            </Field>
            <Field label="Nome do pai" error={errors.nomePai?.message}>
              <Input className="h-10" {...register("nomePai")} />
            </Field>
            <Field label="Nome da mãe" error={errors.nomeMae?.message}>
              <Input className="h-10" {...register("nomeMae")} />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-4">Responsável financeiro</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do responsável" error={errors.responsavel?.message}>
              <Input className="h-10" {...register("responsavel")} />
            </Field>
            <Field label="CPF do responsável" error={errors.cpfResponsavel?.message}>
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
            </Field>
            <Field label="Telefone do responsável" error={errors.telefoneResponsavel?.message}>
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
            </Field>
            <Field label="E-mail do responsável" error={errors.email?.message}>
              <Input
                type="email"
                className="h-10"
                placeholder="usado para login no portal"
                {...register("email")}
              />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-4">Matrícula</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Série / Turma" error={errors.turma?.message}>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                {...register("turma")}
              >
                <option value="">Selecione...</option>
                {turmas.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                {...register("status")}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </Field>

            <Field label="Valor mensalidade (R$)" error={errors.valorMensalidade?.message}>
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
            </Field>
            <Field label="Ano letivo" error={errors.anoLetivo?.message}>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm outline-none focus:border-ring transition-colors"
                {...register("anoLetivo")}
              >
                {anosLetivos.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dia vencimento" error={errors.diaVencimento?.message}>
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
            </Field>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Link to="/alunos">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="size-4" /> {isSubmitting ? "Salvando..." : "Salvar aluno"}
          </Button>
        </div>
      </form>
    </>
  );
}
