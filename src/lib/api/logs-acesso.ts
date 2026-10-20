import api from "@/lib/api";

export interface LogAcessoItem {
  id: number;
  associado_id: number | null;
  nome: string | null;
  email: string | null;
  cpf: string | null;
  evento: "login" | "login_falha" | "logout" | "cadastro" | string;
  motivo: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string | null;
}

export interface LogAcessoResumo {
  total: number;
  logins: number;
  falhas: number;
  associados: number;
  ultimo_acesso: string | null;
}

export interface LogsAcessoFilters {
  data_inicio?: string;
  data_fim?: string;
  evento?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface LogsAcessoResponse {
  current_page: number;
  data: LogAcessoItem[];
  last_page: number;
  total: number;
  per_page: number;
  resumo: LogAcessoResumo;
}

export async function fetchLogsAcesso(filters: LogsAcessoFilters): Promise<LogsAcessoResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  const { data } = await api.get(`/admin/logs-acesso?${params}`);
  return data;
}
