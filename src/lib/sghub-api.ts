// Client-side helpers to talk to /api/apps-script (which proxies Google Apps Script)

export async function appsScriptGet<T = unknown>(query: Record<string, string>): Promise<T> {
  const params = new URLSearchParams(query).toString();
  const res = await fetch(`/api/apps-script?${params}`, { method: "GET" });
  const data = (await res.json()) as T & { success?: boolean; message?: string };
  if (!res.ok) throw new Error(data?.message || `Apps Script GET falhou (${res.status})`);
  if (data?.success === false) throw new Error(data.message || "Apps Script GET falhou.");
  return data;
}

export async function appsScriptPost<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/apps-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { success?: boolean; message?: string };
  if (!res.ok) throw new Error(data?.message || `Apps Script POST falhou (${res.status})`);
  if (data?.success === false) throw new Error(data.message || "Apps Script POST falhou.");
  return data;
}

export async function uploadImage(base64OrDataUrl: string): Promise<string> {
  const res = await fetch(`/api/upload-logo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64OrDataUrl }),
  });
  if (!res.ok) throw new Error(`Upload falhou (${res.status})`);
  const data = (await res.json()) as { url: string };
  return data.url;
}

// ---------- Types ----------

export type PromocaoTipo = "vip_mensal" | "oferta_flash" | "link_exclusivo" | "battlepass" | string;
export type PromocaoStatus = "ativo" | "inativo" | string;

export interface LinkPorCidade {
  countryId: string;
  cityId: string;
  url: string;
  imagem?: string;
}

export interface Promocao {
  id: string;
  status: PromocaoStatus;
  criadoEm?: string;
  atualizadoEm?: string;
  tipo: PromocaoTipo;
  nome?: string;
  nome_interno?: string;
  data_criacao?: string;
  cupom?: string;
  descricao?: string;
  validade?: string;
  imagem?: string;
  // Oferta Flash
  titulo?: string;
  subtitulo?: string;
  produto?: string;
  preco?: string;
  preco_antigo?: string;
  duracao?: string;
  // BattlePass
  miniatura?: string;
  // Oferta da Cidade
  texto_botao?: string;
  preco_total?: string;
  preco_desconto?: string;
  percentual_desconto?: string;
  video?: string;
  link?: string;
  links_por_cidade?: LinkPorCidade[];
}

export interface Cidade {
  id: string;
  nome: string;
}

export interface Local {
  id: string;
  nome: string;
  cidades: Cidade[];
}

export interface Conta {
  id: string;
  usuario: string;
  nome?: string;
  cargo?: string;
  status?: string;
  permissoes?: string[] | Record<string, unknown> | string;
}

export interface InterfaceCfg {
  logoUrl?: string;
  useLogoImage?: boolean;
  sidebarTitle?: string;
  sidebarSubtitle?: string;
  dashboardTitle?: string;
  dashboardSubtitle?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  loginFooter?: string;
  [key: string]: unknown;
}

export interface BootstrapPayload {
  interface: InterfaceCfg;
  locais: Local[];
  contas: Conta[];
  promocoes: Promocao[];
  configuracao?: Record<string, unknown>;
}

interface BootstrapEnvelope {
  success: boolean;
  data?: { payload?: BootstrapPayload } | BootstrapPayload;
  message?: string;
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  const raw = await appsScriptGet<BootstrapEnvelope>({ action: "bootstrapData" });
  const inner = (raw?.data as { payload?: BootstrapPayload })?.payload
    ?? (raw?.data as BootstrapPayload)
    ?? ({} as BootstrapPayload);
  return {
    interface: inner.interface || {},
    locais: Array.isArray(inner.locais) ? inner.locais : [],
    contas: Array.isArray(inner.contas) ? inner.contas : [],
    promocoes: Array.isArray(inner.promocoes) ? inner.promocoes : [],
    configuracao: inner.configuracao || {},
  };
}

/** Ordena promoções pelas mais recentes primeiro (criadoEm desc, fallback data_criacao/atualizadoEm). */
export function sortPromocoesRecentesPrimeiro(list: Promocao[]): Promocao[] {
  const ts = (p: Promocao) =>
    Date.parse(p.criadoEm || p.data_criacao || p.atualizadoEm || "") || 0;
  return [...list].sort((a, b) => ts(b) - ts(a));
}

// ---------- Mutations ----------

function normalizePromocao(p: Partial<Promocao>): Promocao {
  const now = new Date().toISOString();
  return {
    id: (p.id as string) || Math.random().toString(36).slice(2, 11),
    status: p.status || "ativo",
    tipo: p.tipo || "vip_mensal",
    nome: p.nome || "",
    nome_interno: p.nome_interno || p.nome || p.titulo || "Nova Promoção",
    descricao: p.descricao || "",
    cupom: p.cupom || "",
    validade: p.validade || "",
    imagem: p.imagem || "",
    titulo: p.titulo || "",
    subtitulo: p.subtitulo || "",
    produto: p.produto || "",
    preco: p.preco || "",
    preco_antigo: p.preco_antigo || "",
    duracao: p.duracao || "",
    miniatura: p.miniatura || "",
    texto_botao: p.texto_botao || "",
    preco_total: p.preco_total || "",
    preco_desconto: p.preco_desconto || "",
    percentual_desconto: p.percentual_desconto || "",
    video: p.video || "",
    link: p.link || "",
    data_criacao: p.data_criacao || now,
    criadoEm: p.criadoEm || p.data_criacao || now,
    atualizadoEm: now,
    links_por_cidade: Array.isArray(p.links_por_cidade) ? p.links_por_cidade : [],
  };
}

export async function criarPromocao(p: Partial<Promocao>): Promise<Promocao> {
  const payload = normalizePromocao(p);
  await appsScriptPost({ action: "criarPromocao", ...payload });
  return payload;
}

export async function atualizarPromocao(id: string, p: Partial<Promocao>): Promise<Promocao> {
  const payload = normalizePromocao({ ...p, id });
  await appsScriptPost({ action: "atualizarPromocao", ...payload });
  return payload;
}

export async function deletarPromocao(id: string): Promise<void> {
  await appsScriptPost({ action: "deletarPromocao", id });
}

// Contas
export async function criarConta(input: {
  usuario: string;
  senha: string;
  nome?: string;
  cargo?: string;
  status?: string;
  permissoes?: string[] | Record<string, unknown> | string;
}): Promise<void> {
  await appsScriptPost({ action: "criarConta", ...input });
}

export async function atualizarConta(id: string, input: Partial<Conta> & { senha?: string }): Promise<void> {
  await appsScriptPost({ action: "atualizarConta", id, ...input });
}

export async function deletarConta(id: string): Promise<void> {
  await appsScriptPost({ action: "deletarConta", id });
}

// Interface / Locais (locais viajam no salvarInterface junto com o restante)
export async function salvarInterface(
  dados: Record<string, unknown>,
  usuario: string = "OWNER",
): Promise<void> {
  const { contas: _contas, promocoes: _promocoes, ...dadosLeves } = dados;
  await appsScriptPost({ action: "salvarInterface", dados: dadosLeves, usuario, alteradoPor: usuario });
}

// Helper para slugify id de país/cidade novos
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || Math.random().toString(36).slice(2, 8);
}
