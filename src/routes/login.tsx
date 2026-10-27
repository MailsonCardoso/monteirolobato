import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
  lembrar: z.boolean().optional(),
});

type Data = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Data>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", senha: "", lembrar: true },
  });

  const onSubmit = async (data: Data) => {
    const logged = await login(data.email, data.senha);
    if (!logged) {
      toast.error("E-mail ou senha inválidos");
      return;
    }
    toast.success("Bem-vindo de volta!");
    if (logged.must_change_password) {
      navigate({ to: "/trocar-senha", replace: true });
      return;
    }
    const home = logged.role === "secretaria" ? "/alunos" : "/dashboard";
    navigate({ to: home, replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary to-info text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative flex items-center gap-3">
          <img
            src="/logo-2dejulho.jpg"
            alt="2 de Julho"
            className="size-12 rounded-full object-cover border border-white/25 bg-black"
          />
          <div>
            <span className="font-semibold text-lg leading-tight block">2 de Julho</span>
            <span className="text-xs text-primary-foreground/75 block">Colégio Militar Monteiro Lobato</span>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-semibold leading-tight">Gestão Escolar e Financeira</h2>
          <p className="mt-4 text-primary-foreground/85 max-w-md">
            Controle de mensalidades, secretaria, inadimplência e relatórios da Unidade Monteiro Lobato.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/70">© 2026 Colégio Militar 2 de Julho</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm animate-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img
              src="/logo-2dejulho.jpg"
              alt="2 de Julho"
              className="size-11 rounded-full object-cover border border-[#D62828] bg-black"
            />
            <div>
              <span className="font-semibold text-base leading-tight block text-foreground">2 de Julho</span>
              <span className="text-xs text-muted-foreground block">Colégio Militar Monteiro Lobato</span>
            </div>
          </div>
          <Link
            to="/associado"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#D62828] mb-3"
          >
            &larr; Ir para Área do Associado / Responsável
          </Link>
          <h1 className="text-2xl font-semibold">Acesso Administrativo</h1>
          <p className="text-sm text-muted-foreground mt-1">Entre com seu e-mail e senha de equipe</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" className="h-11" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={show ? "text" : "password"}
                  className="h-11 pr-10"
                  {...register("senha")}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Checkbox id="lembrar" {...register("lembrar")} />
                <Label htmlFor="lembrar" className="cursor-pointer">
                  Lembrar acesso
                </Label>
              </div>
              <button
                type="button"
                onClick={() => toast.info("E-mail de recuperação enviado")}
                className="text-primary hover:underline text-sm"
              >
                Esqueci minha senha
              </button>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-base">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
