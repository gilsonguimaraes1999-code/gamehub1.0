import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, Pencil, Globe } from "lucide-react";
import { fetchBootstrap, type Promocao } from "@/lib/sghub-api";
import { useAuthSession } from "@/lib/auth-store";
import { hasPermission } from "@/lib/permissions";
import ModalPreview from "@/components/sghub/ModalPreview";

export const Route = createFileRoute("/hub/detalhes/$id")({
  ssr: false,
  component: DetalhesPage,
});

const TIPO_LABELS: Record<string, string> = {
  vip_mensal: "VIP MENSAL",
  oferta_flash: "OFERTA FLASH",
  link_exclusivo: "LINK EXCLUSIVO",
  battlepass: "BATTLEPASS",
  oferta_cidade: "OFERTA DA CIDADE",
};

const TIPO_ARTIGO: Record<string, "DO" | "DA"> = {
  vip_mensal: "DO",
  oferta_flash: "DA",
  link_exclusivo: "DO",
  battlepass: "DO",
  oferta_cidade: "DA",
};

type Field = { label: string; value: string; isImage?: boolean };

function fieldsFor(p: Promocao): Field[] {
  const v = (x?: string) => (x && String(x).trim() ? String(x) : "");
  const tipo = p.tipo || "vip_mensal";
  const suffix = `${TIPO_ARTIGO[tipo] || "DO"} ${TIPO_LABELS[tipo] || tipo.toUpperCase()}`;
  const f = (base: string, value: string, isImage = false): Field => ({
    label: `${base} ${suffix}`,
    value,
    isImage,
  });

  if (tipo === "oferta_flash") return [
    f("TÍTULO", v(p.titulo)),
    f("SUBTÍTULO", v(p.subtitulo)),
    f("PRODUTO", v(p.produto)),
    f("PREÇO ANTIGO", v(p.preco_antigo)),
    f("PREÇO", v(p.preco)),
    f("DURAÇÃO", v(p.duracao)),
    f("IMAGEM", v(p.imagem), true),
  ];
  if (tipo === "battlepass") return [
    f("NOME", v(p.nome)),
    f("DESCRIÇÃO", v(p.descricao)),
    f("IMAGEM", v(p.imagem), true),
    f("MINIATURA", v(p.miniatura), true),
  ];
  if (tipo === "oferta_cidade") return [
    f("TEXTO DO BOTÃO", v(p.texto_botao)),
    f("PREÇO TOTAL", v(p.preco_total)),
    f("PREÇO COM DESCONTO", v(p.preco_desconto)),
    f("PERCENTUAL DE DESCONTO", v(p.percentual_desconto)),
    f("TÍTULO", v(p.titulo)),
    f("VÍDEO", v(p.video)),
    f("CUPOM", v(p.cupom)),
  ];
  if (tipo === "link_exclusivo") return [
    f("IMAGEM", v(p.imagem), true),
  ];
  return [
    f("NOME", v(p.nome)),
    f("CUPOM", v(p.cupom)),
    f("DESCRIÇÃO", v(p.descricao)),
    f("VALIDADE", v(p.validade)),
    f("IMAGEM", v(p.imagem), true),
  ];
}

function CopyButton({ text, label = "COPIAR BLOCO", disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };
  if (copied) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black"
      >
        <Check size={13} /> Copiado!
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !text}
      className="inline-flex items-center gap-1.5 rounded-md bg-[#d4af37] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100"
    >
      <Copy size={13} /> {label}
    </button>
  );
}

function DetalhesPage() {
  const { id } = useParams({ from: "/hub/detalhes/$id" });
  const { session } = useAuthSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: fetchBootstrap,
    staleTime: 60_000,
  });

  const canView = hasPermission(session, "promocoes.ver");
  const canEdit = hasPermission(session, "promocoes.editar");

  const promocao = useMemo(
    () => (data?.promocoes || []).find((p) => p.id === id) || null,
    [data, id],
  );

  const cityNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const pais of data?.locais || []) for (const c of pais.cidades || []) map.set(c.id, c.nome);
    return map;
  }, [data]);

  const countryNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const pais of data?.locais || []) map.set(pais.id, pais.nome);
    return map;
  }, [data]);

  const cityToCountry = useMemo(() => {
    const map = new Map<string, string>();
    for (const pais of data?.locais || []) for (const c of pais.cidades || []) map.set(c.id, pais.id);
    return map;
  }, [data]);

  const linksByCountry = useMemo(() => {
    const links = promocao?.links_por_cidade || [];
    const groups = new Map<string, { url: string; cityId: string; imagem?: string }[]>();
    for (const l of links) {
      const cid = l.countryId || cityToCountry.get(l.cityId) || "outros";
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push({ url: l.url || "", cityId: l.cityId, imagem: l.imagem || "" });
    }
    return Array.from(groups.entries());
  }, [promocao, cityToCountry]);

  if (!canView) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-red-300">
          Você não tem permissão para visualizar promoções.
        </div>
      </div>
    );
  }
  if (isLoading) {
    return <div className="p-10 text-center text-white/40 text-sm uppercase tracking-widest">Carregando detalhes...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-300">Erro: {(error as Error).message}</div>;
  }
  if (!promocao) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Link to="/hub" className="mb-4 inline-flex items-center gap-2 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-white/50">
          Promoção não encontrada.
        </div>
      </div>
    );
  }

  const status = (promocao.status || "").toLowerCase();
  const isAtivo = status === "ativo";
  const tipoLabel = TIPO_LABELS[promocao.tipo] || (promocao.tipo || "").toUpperCase();
  const title = promocao.nome_interno || promocao.nome || promocao.titulo || "Detalhes";
  const fields = fieldsFor(promocao);


  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <Link
          to="/hub"
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:border-[#d4af37]/40 hover:text-[#f9e29f]"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="break-words font-display text-3xl font-black text-white sm:text-4xl">
            {title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#d4af37]/40 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#f9e29f]">
              {tipoLabel}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                isAtivo
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/15 border-red-500/50 text-red-300"
              }`}
            >
              {isAtivo ? "Ativo" : "Inativo"}
            </span>
            {canEdit && (
              <Link
                to="/hub/promocoes/$id"
                params={{ id: promocao.id }}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/70 hover:border-[#d4af37]/40 hover:text-[#f9e29f]"
              >
                <Pencil size={11} /> Editar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Field cards */}
      <div className="space-y-4">
        {fields.map((f) => (
          <section
            key={f.label}
            className="rounded-xl border border-white/10 bg-[#141414]/80 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-white/70">
                {f.label}
              </h3>
              <CopyButton text={f.value} />
            </div>
            <div className="p-5">
              {f.isImage ? (
                <div className="flex items-center gap-4">
                  {f.value ? (
                    <img
                      src={f.value}
                      alt={f.label}
                      className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover bg-black/40"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0.2";
                      }}
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-lg border border-white/10 bg-black/40" />
                  )}
                  <div className="min-w-0 flex-1 break-all font-mono text-xs text-white/80">
                    {f.value || <span className="text-white/25">—</span>}
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-white/85">
                  {f.value || <span className="text-white/25">—</span>}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Links por cidade */}
      {linksByCountry.length > 0 && (
        <div className="mt-10">
          <div className="mb-5 flex items-center justify-center">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60">
              Links por Cidade
            </span>
          </div>

          <div className="space-y-8">
            {linksByCountry.map(([countryId, cities]) => {
              const countryName = countryNames.get(countryId) || countryId || "Outros";
              return (
                <div key={countryId}>
                  <div className="mb-3 flex items-center gap-2">
                    <Globe size={16} className="text-[#d4af37]" />
                    <span className="font-black uppercase tracking-widest text-white text-sm">
                      {countryName}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {cities.map((c, i) => {
                      const cityName = cityNames.get(c.cityId) || c.cityId || `Cidade ${i + 1}`;
                      return (
                        <div
                          key={`${c.cityId}-${i}`}
                          className="rounded-xl border border-white/10 bg-[#141414]/80 px-4 py-3 space-y-2"
                        >
                          <div className="text-[11px] font-black uppercase tracking-widest text-white">
                            {cityName}
                          </div>
                          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                            <span className="min-w-0 truncate rounded-md bg-black/40 px-3 py-1.5 font-mono text-[11px] text-white/70">
                              {c.url || <span className="text-white/25">— (link da loja)</span>}
                            </span>
                            <CopyButton text={c.url} label="Copiar link" disabled={!c.url} />
                          </div>
                          {promocao.tipo === "oferta_cidade" && (
                            <div className="grid grid-cols-[64px_1fr_auto] items-center gap-2">
                              {c.imagem ? (
                                <img
                                  src={c.imagem}
                                  alt={`Imagem ${cityName}`}
                                  className="h-14 w-14 rounded-lg border border-white/10 object-cover bg-black/40"
                                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-lg border border-white/10 bg-black/40" />
                              )}
                              <span className="min-w-0 truncate rounded-md bg-black/40 px-3 py-1.5 font-mono text-[11px] text-white/70">
                                {c.imagem || <span className="text-white/25">— (imagem da oferta)</span>}
                              </span>
                              <CopyButton text={c.imagem || ""} label="Copiar imagem" disabled={!c.imagem} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview por cidade (Oferta da Cidade) */}
      {promocao.tipo === "oferta_cidade" && (promocao.links_por_cidade || []).length > 0 && (
        <PreviewPorCidade
          promocao={promocao}
          cityNames={cityNames}
          countryNames={countryNames}
          cityToCountry={cityToCountry}
        />
      )}
    </div>
  );
}

function PreviewPorCidade({
  promocao,
  cityNames,
  countryNames,
  cityToCountry,
}: {
  promocao: Promocao;
  cityNames: Map<string, string>;
  countryNames: Map<string, string>;
  cityToCountry: Map<string, string>;
}) {
  const links = promocao.links_por_cidade || [];
  const [selected, setSelected] = useState(0);
  const current = links[selected] || links[0];
  const cityName = cityNames.get(current.cityId) || current.cityId || `Cidade ${selected + 1}`;
  const countryId = current.countryId || cityToCountry.get(current.cityId) || "";
  const countryName = countryNames.get(countryId) || "";

  return (
    <div className="mt-10">
      <div className="mb-5 flex items-center justify-center">
        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60">
          Preview por Cidade
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {links.map((l, i) => {
          const name = cityNames.get(l.cityId) || l.cityId || `Cidade ${i + 1}`;
          const active = i === selected;
          return (
            <button
              key={`${l.cityId}-${i}`}
              onClick={() => setSelected(i)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${
                active
                  ? "border-[#d4af37] bg-[#d4af37] text-black"
                  : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              <Globe size={12} />
              {name}
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Globe size={14} className="text-[#d4af37]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white">
            {cityName}{countryName ? ` — ${countryName}` : ""}
          </span>
        </div>
        <ModalPreview p={{ ...promocao, links_por_cidade: [current] }} />
      </div>
    </div>
  );
}
