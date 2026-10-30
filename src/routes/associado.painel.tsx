import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  User,
  CreditCard,
  History,
  Settings,
  Gift,
  Users,
  Mail,
  Phone,
  Calendar,
  CheckCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  Receipt,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { getAssociado, logoutAssociado, type AssociadoData } from "@/lib/api/associado";
import {
  fetchAssociadoMensalidades,
  gerarCobrancaMensalidade,
  consultarStatusPagamento,
} from "@/lib/api/associado-mensalidades";
import type { Mensalidade } from "@/lib/mock-data";
import { ReciboModal } from "@/components/socio/ReciboModal";
import {
  ProfileCard,
  InfoTile,
  StatCard,
  SectionTitle,
  FloatingTabBar,
  AppHeader,
} from "@/components/socio/socio";
import { MensalidadeRow } from "@/components/socio/mensalidade";
import { PixSheet } from "@/components/socio/PixSheet";

export const Route = createFileRoute("/associado/painel")({
  component: PainelAssociado,
});

const menuItems = [
  { id: "painel", label: "Painel", icon: User },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "historico", label: "Histórico", icon: History },
  { id: "beneficios", label: "Benefícios", icon: Gift },
  { id: "comunidade", label: "Comunidade", icon: Users },
  { id: "dados", label: "Dados", icon: Settings },
];

// referência compartilhada para refresh da lista após pagamento PIX
let setMensalidadesGlobal: (m: Mensalidade[]) => void = () => {};

function PainelAssociado() {
  const navigate = useNavigate();
  const [associado, setAssociado] = useState<AssociadoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("painel");
  const [reciboMensalidade, setReciboMensalidade] = useState<Mensalidade | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("associado_data");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.alunos) parsed.alunos = [];
      setAssociado(parsed);
      setLoading(false);
    }

    const token = localStorage.getItem("associado_token");
    if (!token) {
      if (!stored) navigate({ to: "/associado", replace: true });
      return;
    }

    getAssociado()
      .then((res) => {
        if (res.success && res.associado) {
          const data = res.associado;
          if (!data.alunos) data.alunos = [];
          setAssociado(data);
          localStorage.setItem("associado_data", JSON.stringify(data));
        }
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem("associado_token");
          localStorage.removeItem("associado_data");
          navigate({ to: "/associado", replace: true });
        } else {
          toast.error("Não foi possível atualizar seus dados. Tente novamente.");
        }
      })
      .finally(() => {
        if (!stored) setLoading(false);
      });
  }, [navigate]);

  const handleLogout = async () => {
    await logoutAssociado();
    localStorage.removeItem("associado_token");
    localStorage.removeItem("associado_data");
    toast.success("Sessão encerrada.");
    navigate({ to: "/associado", replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="size-10 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    );
  }

  if (!associado) return null;

  const iniciais = associado.nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      <div className="lg:hidden">
        <AppHeader nome={associado.nome} onLogout={handleLogout} />
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6 overflow-x-hidden">
        <div className="grid gap-6 lg:grid-cols-4">
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* User card */}
              <div className="rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]">
                <div className="flex items-center gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-xl font-bold text-white shadow-lg">
                    {iniciais}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-gray-900">{associado.nome}</h3>
                    <p className="truncate text-xs text-gray-400">{associado.email}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {associado.status === "ativo" ? "Ativo" : associado.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="rounded-3xl border border-black/[0.04] bg-white p-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                        isActive ? "bg-brand text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="size-4" />
                <span>Sair</span>
              </button>
            </div>
          </aside>

          <div className="min-w-0 lg:col-span-3">
            {tab === "painel" && <PainelTab associado={associado} />}
            {tab === "pagamentos" && <PagamentosTab onRecibo={setReciboMensalidade} />}
            {tab === "historico" && <HistoricoTab onRecibo={setReciboMensalidade} />}
            {tab === "dados" && <DadosTab associado={associado} />}
            {tab === "beneficios" && <BeneficiosTab />}
            {tab === "comunidade" && <ComunidadeTab />}
          </div>
        </div>
      </main>

      <FloatingTabBar items={menuItems} active={tab} onChange={setTab} />

      {reciboMensalidade && (
        <ReciboModal
          mensalidade={reciboMensalidade}
          onClose={() => setReciboMensalidade(null)}
        />
      )}
    </div>
  );
}

function usePixFlow() {
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [pix, setPix] = useState<{
    qrCode?: string;
    qrCodeBase64?: string;
    mensalidadeId: string;
    status: "waiting" | "confirmed";
  } | null>(null);

  const handlePagar = async (m: Mensalidade) => {
    if (pagandoId) return;
    setPagandoId(m.id);
    try {
      const result = await gerarCobrancaMensalidade(m.id);
      if (result.success && (result.data?.pix_qr_code_base64 || result.data?.pix_qr_code)) {
        setPix({
          qrCode: result.data.pix_qr_code,
          qrCodeBase64: result.data.pix_qr_code_base64,
          mensalidadeId: m.id,
          status: "waiting",
        });
      } else if (
        result.success &&
        result.data?.payment_url &&
        !result.data.payment_url.includes("/api/")
      ) {
        window.location.href = result.data.payment_url;
      } else {
        toast.error(result.message || "Erro ao gerar cobrança");
      }
    } catch {
      toast.error("Erro ao conectar com Mercado Pago");
    } finally {
      setPagandoId(null);
    }
  };

  const fecharPix = () => {
    setPix(null);
    fetchAssociadoMensalidades()
      .then(setMensalidadesGlobal)
      .catch(() => {});
  };

  useEffect(() => {
    if (!pix || pix.status === "confirmed") return;
    const id = setInterval(async () => {
      try {
        const res = await consultarStatusPagamento(pix.mensalidadeId);
        if (res.data?.status === "pago") {
          setPix((prev) => (prev ? { ...prev, status: "confirmed" } : null));
          setTimeout(fecharPix, 2000);
        }
      } catch {
        // polling ignorado
      }
    }, 3000);
    return () => clearInterval(id);
  }, [pix]);

  return { pagandoId, pix, handlePagar, fecharPix };
}

function PainelTab({ associado }: { associado: AssociadoData }) {
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const { pagandoId, pix, handlePagar, fecharPix } = usePixFlow();
  setMensalidadesGlobal = setMensalidades;

  useEffect(() => {
    fetchAssociadoMensalidades()
      .then(setMensalidades)
      .catch(() => toast.error("Erro ao carregar mensalidades"))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const pendentes = mensalidades.filter((m) => m.status === "pendente");
    const vencidas = mensalidades.filter((m) => m.status === "atrasado");
    const pagas = mensalidades.filter((m) => m.status === "pago");
    const pagoValor = pagas.reduce((a, m) => a + m.valor, 0);
    return { pendentes, vencidas, pagas, pagoValor };
  }, [mensalidades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    );
  }

  const infoTiles = [
    { icon: Mail, label: "E-mail", value: associado.email },
    { icon: Phone, label: "Telefone", value: associado.telefone },
    { icon: User, label: "CPF", value: associado.cpf },
  ];

  return (
    <div className="space-y-6">
      <ProfileCard nome={associado.nome} status={associado.status} />

      <div className="grid grid-cols-2 gap-3">
        {infoTiles.map((t) => (
          <InfoTile key={t.label} icon={t.icon} label={t.label} value={t.value} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total pago"
          value={brl(stats.pagoValor)}
          icon={CheckCheck}
          tone="emerald"
        />
        <StatCard
          label="Pendentes"
          value={String(stats.pendentes.length)}
          sub={
            stats.pendentes.length
              ? brl(stats.pendentes.reduce((a, m) => a + m.valor, 0))
              : undefined
          }
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Vencidas"
          value={String(stats.vencidas.length)}
          sub={
            stats.vencidas.length ? brl(stats.vencidas.reduce((a, m) => a + m.valor, 0)) : undefined
          }
          icon={AlertTriangle}
          tone="red"
        />
        <StatCard
          label="Pagas"
          value={String(stats.pagas.length)}
          sub={
            stats.totalValor > 0
              ? `${Math.round((stats.pagas.length / mensalidades.length) * 100)}%`
              : undefined
          }
          icon={TrendingUp}
          tone="blue"
        />
      </div>

      <PixSheet
        open={!!pix}
        status={pix?.status ?? "waiting"}
        qrCodeBase64={pix?.qrCodeBase64}
        qrCode={pix?.qrCode}
        onClose={fecharPix}
      />
    </div>
  );
}

function PagamentosTab({ onRecibo }: { onRecibo: (m: Mensalidade) => void }) {
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const { pagandoId, pix, handlePagar, fecharPix } = usePixFlow();
  setMensalidadesGlobal = setMensalidades;

  useEffect(() => {
    fetchAssociadoMensalidades()
      .then(setMensalidades)
      .catch(() => toast.error("Erro ao carregar mensalidades"))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const pendentes = mensalidades.filter((m) => m.status === "pendente");
    const vencidas = mensalidades.filter((m) => m.status === "atrasado");
    const pagas = mensalidades.filter((m) => m.status === "pago");
    return { pendentes, vencidas, pagas };
  }, [mensalidades]);

  const filtered = useMemo(() => {
    if (filter === "todas") return mensalidades;
    return mensalidades.filter((m) => m.status === filter);
  }, [mensalidades, filter]);

  const temMultiplosAlunos = useMemo(
    () => new Set(mensalidades.map((m) => m.alunoNome)).size > 1,
    [mensalidades],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    );
  }

  const filters = [
    { key: "todas", label: "Todas" },
    { key: "pendente", label: "Pendentes" },
    { key: "pago", label: "Pagas" },
    { key: "atrasado", label: "Vencidas" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Pendentes"
          value={String(stats.pendentes.length)}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Vencidas"
          value={String(stats.vencidas.length)}
          icon={AlertTriangle}
          tone="red"
        />
        <StatCard
          label="Pagas"
          value={String(stats.pagas.length)}
          icon={CheckCheck}
          tone="emerald"
        />
      </div>

      <div>
        <SectionTitle title="Mensalidades" subtitle="Toque em pagar para gerar o PIX" />
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-brand text-white shadow-sm"
                  : "bg-white text-gray-500 shadow-[0_4px_14px_-8px_rgba(0,0,0,0.15)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Receipt className="mx-auto mb-3 size-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Nada por aqui</p>
          <p className="mt-1 text-xs text-gray-400">Altere o filtro para ver mais resultados</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]">
          <div className="divide-y divide-gray-50">
            {filtered.map((m) => (
              <MensalidadeRow
                key={m.id}
                m={m}
                onPagar={handlePagar}
                onRecibo={onRecibo}
                pagando={pagandoId === m.id}
                showAluno={temMultiplosAlunos}
              />
            ))}
          </div>
        </div>
      )}

      <PixSheet
        open={!!pix}
        status={pix?.status ?? "waiting"}
        qrCodeBase64={pix?.qrCodeBase64}
        qrCode={pix?.qrCode}
        onClose={fecharPix}
      />
    </div>
  );
}

function HistoricoTab({ onRecibo }: { onRecibo: (m: Mensalidade) => void }) {
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssociadoMensalidades()
      .then((data) => setMensalidades(data.filter((m) => m.status === "pago")))
      .catch(() => toast.error("Erro ao carregar histórico"))
      .finally(() => setLoading(false));
  }, []);

  const groupedByYear = useMemo(() => {
    const groups: Record<string, Mensalidade[]> = {};
    const sorted = [...mensalidades].sort((a, b) => {
      const parse = (d: string) => {
        const [dd, mm, yyyy] = d.split("/").map(Number);
        return new Date(yyyy, mm - 1, dd).getTime();
      };
      return parse(b.dataVencimento) - parse(a.dataVencimento);
    });
    for (const m of sorted) {
      const year = m.dataVencimento.split("/")[2];
      if (!groups[year]) groups[year] = [];
      groups[year].push(m);
    }
    return groups;
  }, [mensalidades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    );
  }

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="space-y-6">
      <SectionTitle title="Histórico" subtitle="Registro de todas as suas contribuições" />
      {years.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <History className="mx-auto mb-3 size-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Nenhuma contribuição</p>
        </div>
      ) : (
        years.map((year) => {
          const ms = groupedByYear[year];
          const totalPago = ms.filter((m) => m.status === "pago").reduce((a, m) => a + m.valor, 0);
          const totalGeral = ms.reduce((a, m) => a + m.valor, 0);
          return (
            <div
              key={year}
              className="overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-brand-light">
                    <Calendar className="size-5 text-brand" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">{year}</h4>
                    <p className="text-[11px] text-gray-400">{ms.length} mensalidades</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{brl(totalPago)}</p>
                  <p className="text-[11px] text-gray-400">de {brl(totalGeral)}</p>
                </div>
              </div>
              {totalGeral > 0 && (
                <div className="px-4 pb-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-all duration-700"
                      style={{ width: `${Math.round((totalPago / totalGeral) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="divide-y divide-gray-50">
                {ms.map((m) => (
                  <MensalidadeRow key={m.id} m={m} onRecibo={onRecibo} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function DadosTab({ associado }: { associado: AssociadoData }) {
  const fields = [
    { label: "Nome completo", value: associado.nome, icon: User },
    { label: "E-mail", value: associado.email, icon: Mail },
    { label: "Telefone", value: associado.telefone, icon: Phone },
    { label: "CPF", value: associado.cpf, icon: User },
  ] as const;

  return (
    <div className="space-y-6">
      <SectionTitle title="Dados cadastrais" subtitle="Gerencie suas informações pessoais" />
      <div className="space-y-3">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-3 rounded-3xl border border-black/[0.04] bg-white p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-light">
              <f.icon className="size-5 text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {f.label}
              </p>
              <p className="truncate text-sm font-semibold text-gray-900">{f.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeneficiosTab() {
  const beneficios = [
    {
      icon: Gift,
      title: "Descontos Exclusivos",
      desc: "Aproveite descontos especiais em eventos e atividades da escola.",
    },
    {
      icon: Users,
      title: "Participação Ativa",
      desc: "Participe das decisões importantes da associação de pais e mestres.",
    },
    {
      icon: TrendingUp,
      title: "Acompanhamento",
      desc: "Acompanhe de perto o desenvolvimento educacional do seu filho.",
    },
  ];
  return (
    <div className="space-y-6">
      <SectionTitle title="Benefícios" subtitle="Vantagens de ser um sócio ativo" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {beneficios.map((b) => (
          <div
            key={b.title}
            className="rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)] animate-fade-up"
          >
            <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-brand-light">
              <b.icon className="size-5 text-brand" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">{b.title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{b.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComunidadeTab() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Comunidade" subtitle="Conecte-se com outros associados" />
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-20 text-center">
        <div className="mb-4 grid size-16 place-items-center rounded-full bg-gray-100">
          <Users className="size-8 text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-500">Em breve</p>
        <p className="mt-1 text-xs text-gray-400">O espaço da comunidade está sendo preparado</p>
      </div>
    </div>
  );
}
