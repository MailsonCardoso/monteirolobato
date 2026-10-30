import api from "@/lib/api";
import type { Aluno } from "@/lib/mock-data";

function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function mapKeys<T>(obj: Record<string, unknown>, fn: (k: string) => string): T {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    result[fn(key)] = obj[key];
  }
  return result as T;
}

function alunoFromApi(raw: Record<string, unknown>): Aluno {
  const mapped = mapKeys<Record<string, unknown>>(raw, toCamel);
  mapped.id = String(mapped.id);
  mapped.valorMensalidade = Number(mapped.valorMensalidade) || 0;
  mapped.diaVencimento = Number(mapped.diaVencimento) || 0;
  mapped.situacao = mapped.situacao as "em_dia" | "em_atraso" | "inadimplente";
  if (!mapped.fotoUrl && mapped.foto && typeof mapped.foto === "string") {
    mapped.fotoUrl = mapped.foto.startsWith("http")
      ? mapped.foto
      : `https://api2.platformx.com.br/api/alunos/${mapped.id}/foto`;
  }
  return mapped as unknown as Aluno;
}

function alunoToApi(aluno: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...aluno };
  delete clean.id;
  delete clean.createdAt;
  delete clean.updatedAt;
  delete clean.fotoUrl;
  return mapKeys(clean, toSnake);
}

export async function fetchAluno(id: string): Promise<Aluno> {
  const { data } = await api.get(`/alunos/${id}`);
  return alunoFromApi(data as Record<string, unknown>);
}

export async function fetchAlunos(): Promise<Aluno[]> {
  const { data } = await api.get("/alunos");
  return (data as unknown[]).map((a) => alunoFromApi(a as Record<string, unknown>));
}

export async function createAluno(aluno: Partial<Aluno>): Promise<Aluno> {
  const { data } = await api.post("/alunos", alunoToApi(aluno));
  return alunoFromApi(data as Record<string, unknown>);
}

export async function updateAluno(id: string, aluno: Partial<Aluno>): Promise<Aluno> {
  const { data } = await api.put(`/alunos/${id}`, alunoToApi(aluno));
  return alunoFromApi(data as Record<string, unknown>);
}

export async function uploadFotoAluno(
  id: string,
  fileOrBase64: File | string,
): Promise<{ foto: string; fotoUrl: string }> {
  if (fileOrBase64 instanceof File) {
    const formData = new FormData();
    formData.append("foto", fileOrBase64);
    const { data } = await api.post(`/alunos/${id}/foto`, formData);
    return { foto: data.foto, fotoUrl: data.foto_url };
  } else {
    const { data } = await api.post(`/alunos/${id}/foto`, { foto: fileOrBase64 });
    return { foto: data.foto, fotoUrl: data.foto_url };
  }
}

export async function deleteFotoAluno(id: string): Promise<void> {
  await api.delete(`/alunos/${id}/foto`);
}

export async function checkCpfExists(cpf: string, ignoreId?: string): Promise<boolean> {
  const params: Record<string, string> = {};
  if (ignoreId) params.ignore_id = ignoreId;
  const { data } = await api.get(`/alunos/check-cpf/${encodeURIComponent(cpf)}`, { params });
  return data.exists;
}

export async function deleteAluno(id: string): Promise<void> {
  await api.delete(`/alunos/${id}`);
}
