export type Perfil = "admin" | "secretaria";

const ROUTES: Record<Perfil, string[]> = {
  admin: ["*"],
  secretaria: [
    "/alunos",
    "/gestao-associados",
    "/gestao-inventario",
    "/gestao-ouvidoria",
    "/perfil",
    "/trocar-senha",
  ],
};

export function canAccess(role: string | undefined, pathname: string): boolean {
  if (!role) return false;
  const allowed = ROUTES[role as Perfil];
  if (!allowed) return false;
  if (allowed.includes("*")) return true;
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function homeFor(role: string | undefined): string {
  return role === "secretaria" ? "/alunos" : "/dashboard";
}

export function isSecretaria(role: string | undefined): boolean {
  return role === "secretaria";
}
