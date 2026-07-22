import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, ChevronDown, Calendar, MapPin, X, Copy, Pencil } from "lucide-react";
import { fetchBootstrap, sortPromocoesRecentesPrimeiro, type Local, type Promocao } from "@/lib/sghub-api";
import { useAuthSession } from "@/lib/auth-store";
import { hasPermission } from "@/lib/permissions";

export const Route = createFileRoute("/hub/")({
  ssr: false,
  component: HubHome,
});

const TIPO_LABELS: Record<string, string> = {
  vip_mensal: "VIP MENSAL",
  oferta_flash: "OFERTA FLASH",
  link_exclusivo: "LINK EXCLUSIVO",
  battlepass: "BATTLEPASS",
  oferta_cidade: "OFERTA DA CIDADE",
};

const TIPO_TABS = [
  { key: "todos", label: "TODOS" },
  { key: "vip_mensal", label: "VIP MENSAL" },
  { key: "oferta_flash", label: "OFERTA FLASH" },
  { key: "link_exclusivo", label: "LINK EXCLUSIVO" },
  { key: "battlepass", label: "BATTLEPASS" },
  { key: "oferta_cidade", label: "OFERTA DA CIDADE" },
];

type StatusFilter = "todos" | "ativo" | "inativo";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function HubHome() {
  const { session } = useAuthSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: fetchBootstrap,
    staleTime: 60_000,
  });

  const [tipo, setTipo] = useState<string>("todos");
  const [status, setStatus] = useState<StatusFilter>("ativo");
  const [pais, setPais] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  

  const canView = hasPermission(session, "promocoes.ver");
  const canCreate = hasPermission(session, "promocoes.criar");
  const canEdit = hasPermission(session, "promocoes.editar");

  const promocoes = data?.promocoes ?? [];
  const locais = data?.locais ?? [];

  const cityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of locais) for (const c of l.cidades || []) map.set(c.id, c.nome);
    return map;
  }, [locais]);

  const cityToCountry = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of locais) for (const c of l.cidades || []) map.set(c.id, l.id);
    return map;
  }, [locais]);

  const promoCountries = (p: Promocao) => {
    const s = new Set<string>();
    for (const l of p.links_por_cidade || []) {
      s.add(l.countryId || cityToCountry.get(l.cityId) || "");
    }
    s.delete("");
    return s;
  };

  const filtered = useMemo(() => {
    const sorted = sortPromocoesRecentesPrimeiro(promocoes);
    return sorted.filter((p) => {
      if (status !== "todos" && (p.status || "").toLowerCase() !== status) return false;
      if (tipo !== "todos" && p.tipo !== tipo) return false;
      if (pais !== "todos" && !promoCountries(p).has(pais)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.nome || ""} ${p.nome_interno || ""} ${p.tipo || ""} ${TIPO_LABELS[p.tipo] || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [promocoes, status, tipo, pais, search, cityToCountry]);

  const countsByTipo = useMemo(() => {
    const base = promocoes.filter((p) => status === "todos" || (p.status || "").toLowerCase() === status);
    const counts: Record<string, number> = { todos: base.length };
    for (const p of base) counts[p.tipo] = (counts[p.tipo] || 0) + 1;
    return counts;
  }, [promocoes, status]);

  // Países disponíveis considerando tipo + status atuais
  const paisesDisponiveis = useMemo(() => {
    const base = promocoes.filter((p) => {
      if (status !== "todos" && (p.status || "").toLowerCase() !== status) return false;
      if (tipo !== "todos" && p.tipo !== tipo) return false;
      return true;
    });
    const counts: Record<string, number> = {};
    for (const p of base) for (const cid of promoCountries(p)) counts[cid] = (counts[cid] || 0) + 1;
    return locais
      .filter((l) => counts[l.id])
      .map((l) => ({ id: l.id, nome: l.nome, count: counts[l.id] }));
  }, [promocoes, locais, status, tipo, cityToCountry]);

  useEffect(() => {
    if (pais !== "todos" && !paisesDisponiveis.some((p) => p.id === pais)) setPais("todos");
  }, [pais, paisesDisponiveis]);



  return (
    <div className="px-6 lg:px-12 py-10 lg:py-14 pt-20 lg:pt-14 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 mb-10">
        <div className="min-w-0">
          <h1 className="manual-comercial-gold text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight leading-[0.95] break-words">
            HUB INGAME
          </h1>
          <p className="text-white/60 max-w-2xl leading-relaxed mt-4 text-sm sm:text-base">
            Bem-vindo ao Comercial SantaGroup. Selecione uma promoção para ver os detalhes.
          </p>
        </div>
        {canCreate && (
          <Link
            to="/hub/promocoes/nova"
            className="shrink-0 flex items-center gap-2 rounded-2xl bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black font-black uppercase tracking-widest text-xs sm:text-sm px-5 sm:px-6 py-4 hover:-translate-y-0.5 transition-transform"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="hidden sm:inline">Nova Promoção</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        )}
      </header>

      {!canView && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center text-red-200">
          Você não tem permissão para visualizar promoções.
        </div>
      )}

      {canView && (
      <>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou tipo..."
          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/40 outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.05] transition-all"
        />
      </div>

      {/* Tabs + Status selector */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {TIPO_TABS.map((t) => {
            const active = tipo === t.key;
            const count = countsByTipo[t.key] || 0;
            return (
              <button
                key={t.key}
                onClick={() => setTipo(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                  ${active
                    ? "bg-[#d4af37] text-black shadow-[0_0_15px_rgba(212,175,55,0.25)]"
                    : "bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:border-white/20"}`}
              >
                <span>{t.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] ${active ? "bg-black/20 text-black" : "bg-white/5 text-white/40"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-white/[0.03] border border-white/10 text-white/80 hover:border-[#d4af37]/40 transition-all"
          >
            <span className="text-white/40">Status:</span>
            <span className="text-[#d4af37]">
              {status === "todos" ? "Todos" : status === "ativo" ? "Ativo" : "Inativo"}
            </span>
            <ChevronDown size={14} className={`transition-transform ${statusOpen ? "rotate-180" : ""}`} />
          </button>
          {statusOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStatusOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 rounded-xl bg-[#0f0f0f] border border-white/10 shadow-2xl overflow-hidden z-50">
                {(["todos", "ativo", "inativo"] as StatusFilter[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setStatus(opt); setStatusOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors
                      ${status === opt ? "text-[#d4af37] bg-white/5" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${status === opt ? "bg-[#d4af37]" : "bg-white/20"}`} />
                    <span className="capitalize">{opt === "todos" ? "Todos" : opt}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* País tabs */}
      {paisesDisponiveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8 -mt-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mr-1">País:</span>
          <button
            onClick={() => setPais("todos")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all
              ${pais === "todos"
                ? "bg-[#d4af37]/15 border border-[#d4af37]/50 text-[#f9e29f]"
                : "bg-white/[0.02] border border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}
          >
            Todos
          </button>
          {paisesDisponiveis.map((p) => {
            const active = pais === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPais(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all
                  ${active
                    ? "bg-[#d4af37]/15 border border-[#d4af37]/50 text-[#f9e29f]"
                    : "bg-white/[0.02] border border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}
              >
                <span>{p.nome}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${active ? "bg-black/30 text-[#f9e29f]" : "bg-white/5 text-white/40"}`}>
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-white/40 text-sm uppercase tracking-widest">
          Carregando promoções...
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300">
          Erro ao carregar: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
          Nenhuma promoção encontrada com os filtros atuais.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => (
          <PromocaoCard key={p.id} promocao={p} cityNameById={cityNameById} canEdit={canEdit} />
        ))}
      </div>
      </>
      )}

    </div>
  );
}

function PromocaoCard({ promocao, cityNameById, canEdit }: { promocao: Promocao; cityNameById: Map<string, string>; canEdit: boolean }) {
  const status = (promocao.status || "").toLowerCase();
  const isAtivo = status === "ativo";
  const tipoLabel = TIPO_LABELS[promocao.tipo] || promocao.tipo?.toUpperCase() || "—";
  const cidades = Array.from(
    new Set((promocao.links_por_cidade || []).map((l) => cityNameById.get(l.cityId) || l.cityId))
  );
  const cidadesCount = cidades.length;

  const bgImage =
    promocao.imagem ||
    promocao.miniatura ||
    (promocao.links_por_cidade || []).find((l) => l && l.imagem)?.imagem ||
    "";

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border p-5 backdrop-blur-sm transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden
        ${isAtivo
          ? "border-white/10 bg-[#0d0d0d]/70 hover:border-[#d4af37]/40 hover:bg-[#111]/80"
          : "border-red-500/40 bg-[#170a0a]/70 hover:border-red-500/70 hover:bg-[#1a0c0c]/80"}`}
    >
      {/* Background image (transparent, decorative) */}
      {bgImage && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-[0.14] group-hover:opacity-20 transition-opacity"
          />
          <div
            className={`absolute inset-0 ${
              isAtivo
                ? "bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/85 to-[#0d0d0d]/55"
                : "bg-gradient-to-t from-[#170a0a] via-[#170a0a]/85 to-[#170a0a]/55"
            }`}
          />
        </div>
      )}

      {/* Header: status dot + title */}
      <div className="relative z-10 flex items-start gap-2.5 mb-3 pr-20">
        <span
          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isAtivo ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`}
          aria-label={isAtivo ? "Ativo" : "Inativo"}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-white text-base leading-tight line-clamp-2 break-words">
            {promocao.nome_interno || promocao.nome || "Sem nome"}
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] mt-1.5">
            {tipoLabel}
          </p>
        </div>
      </div>

      {/* Cidades chips */}
      {cidades.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-1.5 mb-4">
          {cidades.slice(0, 6).map((c) => (
            <span key={c} className="px-2.5 py-1 rounded-md bg-[#d4af37]/10 border border-[#d4af37]/25 text-[10px] font-bold uppercase tracking-wide text-[#f9e29f]">
              {c}
            </span>
          ))}
          {cidades.length > 6 && (
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-white/50">
              +{cidades.length - 6}
            </span>
          )}
        </div>
      )}


      <div className="relative z-10 mt-auto pt-4 border-t border-white/5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 text-[11px] text-white/50">
            <span className="flex items-center gap-1.5 shrink-0">
              <Calendar size={12} className="text-white/40" />
              {formatDate(promocao.criadoEm || promocao.data_criacao)}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <MapPin size={12} className="text-white/40" />
              {cidadesCount} {cidadesCount === 1 ? "cidade" : "cidades"}
            </span>
          </div>
          <Link to="/hub/detalhes/$id" params={{ id: promocao.id }} className="shrink-0 text-[10px] font-black uppercase tracking-widest text-[#d4af37] group-hover:text-[#f9e29f] transition-colors">
            Ver detalhes →
          </Link>

        </div>
        {canEdit && (
          <Link to="/hub/promocoes/$id" params={{ id: promocao.id }} className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:border-[#d4af37]/40 hover:text-[#f9e29f]">
            <Pencil size={12} /> Editar
          </Link>
        )}
      </div>

      {/* Status badge (top right) */}
      <span
        className={`absolute top-4 right-4 z-10 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border

          ${isAtivo
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-red-500/15 border-red-500/50 text-red-300"}`}
      >
        {isAtivo ? "Ativo" : "Inativo"}
      </span>
    </article>
  );
}

function fieldLine(label: string, value?: string) {
  return `${label}: ${value || "—"}`;
}

function buildPromoLines(p: Promocao, cityName: string, cityUrl: string) {
  const tipo = p.tipo || "vip_mensal";
  if (tipo === "oferta_flash") return [
    fieldLine("Cidade", cityName), fieldLine("Título", p.titulo), fieldLine("Subtítulo", p.subtitulo), fieldLine("Produto", p.produto),
    fieldLine("Preço Antigo", p.preco_antigo), fieldLine("Preço", p.preco), fieldLine("Link", cityUrl || p.link), fieldLine("Duração", p.duracao), fieldLine("Imagem", p.imagem),
  ];
  if (tipo === "battlepass") return [
    fieldLine("Cidade", cityName), fieldLine("BattlePass Imagem", p.imagem), fieldLine("BattlePass Nome", p.nome), fieldLine("BattlePass URL Botão", cityUrl || p.link),
    fieldLine("BattlePass Descrição", p.descricao), fieldLine("BattlePass Miniatura Imagem", p.miniatura),
  ];
  if (tipo === "oferta_cidade") return [
    fieldLine("Cidade", cityName), fieldLine("Imagem", p.imagem), fieldLine("Texto do Botão", p.texto_botao), fieldLine("Preço Total", p.preco_total),
    fieldLine("Preço Desconto", p.preco_desconto), fieldLine("Percentual", p.percentual_desconto), fieldLine("Título", p.titulo), fieldLine("Vídeo", p.video), fieldLine("Link", cityUrl), fieldLine("Cupom", p.cupom),
  ];
  if (tipo === "link_exclusivo") return [fieldLine("Cidade", cityName), fieldLine("Imagem", p.imagem), fieldLine("Link", cityUrl || p.link)];
  return [
    fieldLine("Cidade", cityName), fieldLine("Nome", p.nome), fieldLine("Cupom", p.cupom), fieldLine("Descrição", p.descricao),
    fieldLine("Validade", p.validade), fieldLine("Link", cityUrl || p.link), fieldLine("Imagem", p.imagem),
  ];
}

function DetalhesModal({ promocao, locais, onClose }: { promocao: Promocao; locais: Local[]; onClose: () => void }) {
  const cityNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const pais of locais) for (const cidade of pais.cidades || []) map.set(cidade.id, cidade.nome);
    return map;
  }, [locais]);
  const links = promocao.links_por_cidade?.length ? promocao.links_por_cidade : [{ countryId: "", cityId: "", url: promocao.link || "" }];

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Informações copiadas.");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#d4af37]">{TIPO_LABELS[promocao.tipo] || promocao.tipo}</p>
            <h2 className="mt-1 break-words font-display text-2xl font-black text-white">{promocao.nome_interno || promocao.nome || promocao.titulo || "Detalhes"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          {links.map((link, idx) => {
            const cityName = cityNames.get(link.cityId) || link.cityId || `Cidade ${idx + 1}`;
            const lines = buildPromoLines(promocao, cityName, link.url);
            const text = lines.join("\n");
            return (
              <section key={`${link.countryId}-${link.cityId}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-black text-white">{cityName}</h3>
                  <button type="button" onClick={() => copy(text)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black hover:brightness-110">
                    <Copy size={13} /> Copiar
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-white/75">{text}</pre>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
