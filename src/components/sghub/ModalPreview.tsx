import { ImageIcon } from "lucide-react";
import type { Promocao } from "@/lib/sghub-api";

const TIPO_LABEL: Record<string, string> = {
  vip_mensal: "VIP MENSAL",
  oferta_flash: "OFERTA FLASH",
  link_exclusivo: "LINK EXCLUSIVO",
  battlepass: "BATTLEPASS",
  oferta_cidade: "OFERTA DA CIDADE",
};

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?#]+)/);
      if (m) return `https://www.youtube.com/embed/${m[2]}`;
    }
    if (host === "drive.google.com") {
      const m = u.pathname.match(/\/file\/d\/([^/]+)/);
      const id = m?.[1] || u.searchParams.get("id");
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

function renderHtml(text?: string) {
  if (!text) return null;
  return <span dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, "<br>") }} />;
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 min-w-0">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
        {label}
      </div>
      <div className="text-sm text-white leading-snug break-all">{children}</div>
    </div>
  );
}

export default function ModalPreview({ p }: { p: Partial<Promocao> }) {
  const tipo = p.tipo || "vip_mensal";
  const image = p.imagem || p.miniatura;
  const isActive = (p.status || "ativo") === "ativo";

  // Custom layout for oferta_cidade (mirrors in-game modal)
  if (tipo === "oferta_cidade") {
    const cityImg = (p.links_por_cidade || []).find((l) => l && l.imagem)?.imagem;
    const mediaSrc = cityImg || image;
    const video = p.video;
    const buttonText = p.texto_botao || "COMPRAR";

    return (
      <aside className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-[#e5c12f]" />
          <h3 className="text-lg font-bold text-white">Modal Preview</h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
              {TIPO_LABEL[tipo]}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? "bg-[#e5c12f]" : "bg-red-500"
              }`}
            />
          </div>

          <div className="grid grid-cols-[1fr_180px] gap-3 items-stretch">
            {/* Left: video / image */}
            <div className="rounded-lg overflow-hidden bg-black border border-white/10 aspect-video flex items-center justify-center relative">
              {(() => {
                const embed = video ? toEmbedUrl(video) : null;
                if (video && embed) {
                  return (
                    <iframe
                      src={embed}
                      className="w-full h-full"
                      allow="accelerated-encoding; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                if (video && isDirectVideo(video)) {
                  return (
                    <video src={video} className="w-full h-full object-cover" controls muted playsInline />
                  );
                }
                if (mediaSrc) {
                  return <img src={mediaSrc} alt="preview" className="w-full h-full object-cover" />;
                }
                return (
                  <div className="text-white/20 text-[10px] uppercase tracking-widest">
                    Sem vídeo / imagem
                  </div>
                );
              })()}
            </div>

            {/* Right: buy panel */}
            <div className="rounded-lg bg-[#101828] border border-white/10 flex flex-col overflow-hidden h-full">
              <div className="relative flex-1 flex items-center justify-center p-3 pt-6 min-h-[160px]">
                {p.percentual_desconto && (
                  <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[11px] font-black px-2 py-0.5 rounded">
                    {String(p.percentual_desconto).replace("%", "")}%
                  </span>
                )}
                {mediaSrc ? (
                  <img src={mediaSrc} alt="item" className="max-w-full max-h-[140px] object-contain" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10" />
                )}
              </div>

              {p.cupom && (
                <div className="px-2 pb-2">
                  <div className="flex items-center gap-2 rounded-md bg-[#ef6f88] p-2 shadow-md">
                    <div className="flex-shrink-0 w-11 h-11 rounded bg-black/30 border border-white/20 flex items-center justify-center overflow-hidden">
                      {mediaSrc ? (
                        <img src={mediaSrc} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-center">
                      <div className="text-[9px] font-black uppercase tracking-widest text-white/90 leading-tight">
                        Coupon
                      </div>
                      <div className="text-[12px] font-black text-white leading-tight truncate">
                        {p.cupom}
                      </div>
                      <div className="mt-1 inline-block rounded-full bg-white/30 px-2 py-[2px] text-[9px] font-bold text-white">
                        Copy Coupon
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-2 pb-2 text-center">
                {p.preco_total && p.preco_desconto && (
                  <div className="text-[9px] text-white/60 mb-0.5">
                    Save ${Math.max(0, Number(String(p.preco_total).replace(/\D/g, "")) - Number(String(p.preco_desconto).replace(/\D/g, "")))}
                  </div>
                )}
                <div className="flex items-baseline justify-center gap-1.5 mb-2">
                  {p.preco_total && (
                    <span className="text-white/50 line-through text-[11px]">
                      ${p.preco_total}
                    </span>
                  )}
                  {p.preco_desconto && (
                    <span className="text-white font-black text-sm">
                      $ {p.preco_desconto}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full py-2 rounded bg-[#f4c81f] text-black text-[11px] font-black uppercase tracking-widest"
                >
                  {buttonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon size={18} className="text-[#e5c12f]" />
        <h3 className="text-lg font-bold text-white">Modal Preview</h3>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#141414] to-[#0a0a0a] p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
            {TIPO_LABEL[tipo] || tipo}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-[#e5c12f] shadow-[0_0_8px_#e5c12f]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
            }`}
          />
        </div>

        {/* Image */}
        <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/60 border border-white/5 mb-4 flex items-center justify-center">
          {image ? (
            <img src={image} alt="preview" className="w-full h-full object-contain" />
          ) : (
            <div className="text-white/20 text-xs uppercase tracking-widest">Sem imagem</div>
          )}
        </div>

        {/* Body per tipo */}
        <div className="space-y-3">
          {tipo === "vip_mensal" && (
            <>
              <Block label="Nome">{p.nome || <em className="text-white/30">Nome do VIP</em>}</Block>
              <Block label="Cupom">
                <span className="text-[#e5c12f] font-bold">
                  {p.cupom || "CUPOM: (NOME DA CIDADE)"}
                </span>
              </Block>
              {p.descricao && <Block label="Descrição">{renderHtml(p.descricao)}</Block>}
              {p.validade && <Block label="Validade">{p.validade}</Block>}
            </>
          )}

          {tipo === "oferta_flash" && (
            <>
              <Block label="Título">{p.titulo || <em className="text-white/30">Título</em>}</Block>
              {p.subtitulo && <Block label="Subtítulo">{p.subtitulo}</Block>}
              {p.produto && <Block label="Produto">{p.produto}</Block>}
              <div className="flex items-baseline gap-3 px-1">
                {p.preco_antigo && (
                  <span className="text-white/40 line-through text-sm">{p.preco_antigo}</span>
                )}
                {p.preco && (
                  <span className="text-[#e5c12f] font-black text-2xl">{p.preco}</span>
                )}
              </div>
              {p.duracao && <Block label="Duração">{p.duracao}</Block>}
            </>
          )}

          {tipo === "battlepass" && (
            <>
              <Block label="Passe">{p.nome || <em className="text-white/30">Nome do passe</em>}</Block>
              {p.descricao && <Block label="Descrição">{renderHtml(p.descricao)}</Block>}
            </>
          )}

          {tipo === "link_exclusivo" && (
            <div className="text-white/60 text-xs text-center py-2">
              Link exclusivo — clique para acessar
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            className="py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/80"
          >
            Cancelar
          </button>
          <button
            type="button"
            className="py-3 rounded-xl bg-[#e5c12f] text-black text-[11px] font-black uppercase tracking-widest"
          >
            Confirmar
          </button>
        </div>
      </div>
    </aside>
  );
}

