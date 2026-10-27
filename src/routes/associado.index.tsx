import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  LogIn,
  Eye,
  EyeOff,
  Shield,
  QrCode,
  FileText,
  Lock,
  Mail,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { loginAssociado } from "@/lib/api/associado";

export const Route = createFileRoute("/associado/")({
  component: AssociadoLoginScreen,
});

function erroAmigavel(err: unknown): string {
  const fallback = "Não foi possível concluir o acesso. Tente novamente.";
  if (!axios.isAxiosError(err)) return fallback;

  const data = err.response?.data as
    | { message?: string; errors?: Record<string, string[]> }
    | undefined;

  if (err.response?.status === 401) {
    return "E-mail ou CPF inválidos. Verifique os dados e tente novamente.";
  }

  const primeiroErro = data?.errors
    ? Object.values(data.errors)
        .flat()
        .find((msg) => typeof msg === "string")
    : undefined;

  const msg = primeiroErro ?? data?.message;
  if (!msg) return fallback;

  const traducoes: Record<string, string> = {
    "The password field is required.": "Informe seu CPF (senha de acesso) para entrar.",
    "The email field is required.": "Informe seu e-mail para entrar.",
    "The email must be a valid email address.": "Informe um e-mail válido.",
    "The cpf field is required.": "Informe seu CPF.",
    "The cpf field must be 11 characters.": "O CPF deve conter 11 números.",
    "The password must be at least 6 characters.": "A senha deve ter pelo menos 6 dígitos.",
  };

  return traducoes[msg] ?? fallback;
}

function AssociadoLoginScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("associado_token");
    if (token) {
      navigate({ to: "/associado/painel", replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    const email = emailRef.current?.value.trim() ?? "";
    const password = (passwordRef.current?.value ?? "").replace(/\D/g, "");

    if (!email) {
      toast.error("Informe seu e-mail cadastrado.");
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      toast.error("Informe seu CPF (senha de acesso).");
      passwordRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await loginAssociado(email, password);

      if (res.success && res.token) {
        localStorage.setItem("associado_token", res.token);
        if (res.associado) {
          localStorage.setItem("associado_data", JSON.stringify(res.associado));
        }
        toast.success(res.message || "Acesso realizado com sucesso!");
        navigate({ to: "/associado/painel", replace: true });
      } else {
        toast.error(res.message || "Não foi possível validar o acesso.");
      }
    } catch (err) {
      console.error("Erro no login do associado:", err);
      toast.error(erroAmigavel(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-gray-50 text-foreground selection:bg-[#D62828] selection:text-white">
      {/* Coluna Visual Institucional */}
      <div className="lg:col-span-6 xl:col-span-7 bg-gradient-to-br from-[#990000] via-[#B71C1C] to-[#D62828] text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Padrão decorativo sutil */}
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-black/20 blur-3xl pointer-events-none" />

        {/* Topo institucional */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo-2dejulho.jpg"
            alt="Colégio Militar 2 de Julho - Monteiro Lobato"
            className="size-14 sm:size-16 rounded-full object-cover border-2 border-white/30 shadow-lg bg-black"
          />
          <div>
            <span className="inline-block text-[11px] font-semibold tracking-wider uppercase text-white/80 bg-white/15 px-2.5 py-0.5 rounded-full mb-0.5">
              Corpo de Bombeiros Militar do Maranhão
            </span>
            <p className="text-base sm:text-lg font-bold leading-tight">
              Colégio Militar 2 de Julho
            </p>
            <p className="text-xs text-white/70">Unidade XLI — Monteiro Lobato</p>
          </div>
        </div>

        {/* Conteúdo central */}
        <div className="relative z-10 my-12 lg:my-0 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold mb-6 border border-white/20">
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            Portal do Associado & Responsável
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Gestão Escolar <br className="hidden sm:inline" />
            <span className="text-amber-300">2 de Julho</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-white/85 leading-relaxed">
            Consulte mensalidades, gere pagamentos via PIX e acesse seus
            comprovantes em um ambiente exclusivo e seguro.
          </p>

          {/* Destaques / Benefícios */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <QrCode className="size-5 text-amber-300 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">Pagamento PIX</p>
                <p className="text-white/70">Baixa imediata</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <FileText className="size-5 text-amber-300 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">Comprovantes</p>
                <p className="text-white/70">Emissão em PDF</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <Shield className="size-5 text-amber-300 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">100% Seguro</p>
                <p className="text-white/70">Protegido LGPD</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Hero */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Colégio Militar 2 de Julho — Monteiro Lobato</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" /> Sistema Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Coluna do Formulário de Login */}
      <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo exibido no topo no mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
            <img
              src="/logo-2dejulho.jpg"
              alt="2 de Julho"
              className="size-12 rounded-full object-cover border-2 border-[#D62828] bg-black"
            />
            <div>
              <p className="font-bold text-gray-900 text-sm">Colégio Militar 2 de Julho</p>
              <p className="text-xs text-gray-500">Unidade Monteiro Lobato</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Área do Associado
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              Digite seu e-mail e CPF cadastrado para acessar o portal do responsável.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="associado-email" className="block text-sm font-semibold text-gray-700">
                E-mail do Responsável
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="size-4" />
                </div>
                <input
                  id="associado-email"
                  ref={emailRef}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Campo Senha / CPF */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="associado-cpf" className="block text-sm font-semibold text-gray-700">
                  Senha de Acesso (CPF)
                </label>
                <span className="text-xs text-gray-400">Somente números</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="size-4" />
                </div>
                <input
                  id="associado-cpf"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Digite seu CPF (11 números)"
                  className="w-full h-12 pl-10 pr-11 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar CPF" : "Exibir CPF"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Botão de Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 px-6 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white font-semibold text-sm transition-all shadow-md shadow-[#D62828]/25 hover:shadow-lg hover:shadow-[#D62828]/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  <span>Entrar no Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Links e Apoio */}
          <div className="mt-8 pt-6 border-t border-gray-200/80 space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Shield className="size-3.5 text-emerald-600" /> Ambiente criptografado
              </span>
              <Link
                to="/login"
                className="text-gray-500 hover:text-[#D62828] font-medium transition-colors"
              >
                Acesso Administrativo &rarr;
              </Link>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              Primeiro acesso ou precisa de ajuda com seu cadastro? Entre em contato com a secretaria
              escolar do Colégio Militar 2 de Julho.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
