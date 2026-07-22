import type { SgHubSession } from "@/lib/auth-store";

export interface PermissaoDef { key: string; label: string; descricao: string; }
export interface PermissaoGrupo { key: string; titulo: string; itens: PermissaoDef[]; }

export const PERMISSOES_GRUPOS: PermissaoGrupo[] = [
  {
    key: "promocoes",
    titulo: "Promoções",
    itens: [
      { key: "promocoes.ver", label: "Visualizar", descricao: "Ver o dashboard e as promoções." },
      { key: "promocoes.criar", label: "Criar", descricao: "Criar novas promoções." },
      { key: "promocoes.editar", label: "Editar", descricao: "Alterar promoções existentes." },
      { key: "promocoes.excluir", label: "Excluir", descricao: "Remover promoções." },
    ],
  },
  {
    key: "contas",
    titulo: "Contas de Acesso",
    itens: [
      { key: "contas.ver", label: "Visualizar", descricao: "Ver a lista de contas." },
      { key: "contas.criar", label: "Criar", descricao: "Cadastrar novas contas." },
      { key: "contas.editar", label: "Editar", descricao: "Alterar contas existentes." },
      { key: "contas.excluir", label: "Excluir", descricao: "Remover contas." },
    ],
  },
  {
    key: "locais",
    titulo: "Locais (Países / Cidades)",
    itens: [
      { key: "locais.ver", label: "Visualizar", descricao: "Ver países e cidades cadastrados." },
      { key: "locais.editar", label: "Editar", descricao: "Adicionar, reordenar e remover países/cidades." },
    ],
  },
  {
    key: "configuracoes",
    titulo: "Configurações da Interface",
    itens: [
      { key: "configuracoes.ver", label: "Visualizar", descricao: "Acessar a página de configurações." },
      { key: "configuracoes.editar", label: "Editar", descricao: "Alterar títulos, logotipo e demais opções." },
    ],
  },
];

export const TODAS_PERMISSOES = PERMISSOES_GRUPOS.flatMap((g) => g.itens.map((i) => i.key));
// Visitante = somente visualização do dashboard/promoções. Nada mais.
export const PERMISSOES_VISITANTE = ["promocoes.ver"];

export type PermissoesPorCargo = Record<string, string[]>;

export function normalizeCargo(cargo?: string) {
  return (cargo || "VISITANTE").trim().toUpperCase();
}

export function permissoesPadrao(): PermissoesPorCargo {
  return {
    OWNER: [...TODAS_PERMISSOES],
    ADMIN: [...TODAS_PERMISSOES],
    COMERCIAL: [
      "promocoes.ver", "promocoes.criar", "promocoes.editar",
      "locais.ver",
      "configuracoes.ver",
    ],
    VISITANTE: [...PERMISSOES_VISITANTE],
  };
}

export function toPermissionArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try { return toPermissionArray(JSON.parse(trimmed)); } catch { return trimmed.split(/[;,\n]/).map((v) => v.trim()).filter(Boolean); }
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, allowed]) => allowed === true || allowed === "true" || allowed === 1)
      .map(([key]) => key);
  }
  return [];
}

export function getSessionPermissions(session: SgHubSession | null | undefined) {
  const cargo = normalizeCargo(session?.tipo);
  if (cargo === "OWNER") return new Set(TODAS_PERMISSOES);
  const explicit = session?.permissoes ? toPermissionArray(session.permissoes) : undefined;
  const fallback = permissoesPadrao()[cargo] || PERMISSOES_VISITANTE;
  return new Set(explicit ?? fallback);
}

export function hasPermission(session: SgHubSession | null | undefined, key: string) {
  if (normalizeCargo(session?.tipo) === "OWNER") return true;
  return getSessionPermissions(session).has(key);
}