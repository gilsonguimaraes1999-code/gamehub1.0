import { Clock3, Copy, ImageIcon, ShoppingCart, X } from "lucide-react";
import type { Promocao } from "@/lib/sghub-api";
import { useI18n } from "@/lib/i18n";

const TIPO_LABEL_KEYS: Record<string, string> = {
  vip_mensal: "promotion.type.vip_mensal",
  oferta_flash: "promotion.type.oferta_flash",
  link_exclusivo: "promotion.type.link_exclusivo",
  battlepass: "promotion.type.battlepass",
  oferta_cidade: "promotion.type.oferta_cidade",
  cupom: "promotion.type.cupom",
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
  return (
    <span dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, "<br>") }} />
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 min-w-0">
      <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">
        {label}
      </div>
      <div className="text-sm text-white leading-snug break-all">
        {children}
      </div>
    </div>
  );
}

export default function ModalPreview({ p }: { p: Partial<Promocao> }) {
  const { t } = useI18n();
  const tipo = p.tipo || "vip_mensal";
  const image = p.imagem || p.miniatura;
  const isActive = (p.status || "ativo") === "ativo";

  if (tipo === "cupom") {
    const discount = String(p.percentual_desconto || "30").replace("%", "");
    const category = p.categoria || t("modalPreview.couponStorewide");
    const code = p.cupom || "NOBRE";

    return (
      <aside className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-[#e5c12f]" />
          <h3 className="text-lg font-bold text-white">
            {t("modalPreview.title")}
          </h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e1110] shadow-2xl">
          <div className="flex items-start justify-between gap-6 px-5 sm:px-7 pt-5 sm:pt-7 pb-4">
            <div>
              <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                {t("modalPreview.couponWelcome")}
              </h4>
              <p className="mt-1 text-sm text-white/55">
                {t("modalPreview.couponSubtitle")}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("common.close")}
              className="rounded-md bg-white/10 p-2 text-white/75"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 sm:px-7">
            <div className="relative min-h-36 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(115deg,#29110f,#6e1822_45%,#d93d2d)]">
              {p.imagem && (
                <img
                  src={p.imagem}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-black/20" />
              <div className="relative z-10 flex min-h-36 max-w-2xl flex-col items-start justify-center p-5 sm:p-6">
                <span className="text-xl font-black text-white">
                  {category}
                </span>
                <span className="mt-1 max-w-xl text-sm text-white/75">
                  {t("modalPreview.couponBannerText")}
                </span>
                <span className="mt-4 rounded-lg bg-[#16c1df] px-5 py-2 text-sm font-black text-white">
                  {t("modalPreview.buyNow")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 sm:px-7 py-5 sm:py-6 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-white/[0.015] p-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4 text-white">
                <ShoppingCart size={22} />
                <h5 className="text-lg font-black uppercase">
                  {t("modalPreview.store")}
                </h5>
              </div>
              <p className="mt-4 text-base font-bold text-white/55">
                {category}
              </p>
              <p className="mt-1 text-3xl font-black text-white">
                {discount}% OFF
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/55">
                <Clock3 size={16} />
                <span>
                  {p.data_expiracao
                    ? `${t("modalPreview.expiresAt")}: ${p.data_expiracao.replace("T", " ")}`
                    : t("modalPreview.noExpiration")}
                </span>
              </div>
              {p.valor_minimo && (
                <p className="mt-2 text-xs text-white/45">
                  {t("modalPreview.minimumPurchase")}: {p.valor_minimo}
                </p>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3 font-bold text-white">
                  <Copy size={16} /> {code}
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-[#16c1df] px-4 py-3 font-bold text-white"
                >
                  {t("modalPreview.useNow")}
                </button>
              </div>
            </section>

            <div className="hidden min-h-60 rounded-xl border border-dashed border-white/5 bg-gradient-to-br from-white/[0.015] to-transparent lg:block" />
          </div>
        </div>
      </aside>
    );
  }

  // Custom layout for oferta_cidade (mirrors in-game modal)
  if (tipo === "oferta_cidade") {
    const cityImg = (p.links_por_cidade || []).find(
      (l) => l && l.imagem,
    )?.imagem;
    const mediaSrc = cityImg || image;
    const video = p.video;
    const buttonText = p.texto_botao || t("modalPreview.buy");

    return (
      <aside className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-[#e5c12f]" />
          <h3 className="text-lg font-bold text-white">
            {t("modalPreview.title")}
          </h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
              {TIPO_LABEL_KEYS[tipo] ? t(TIPO_LABEL_KEYS[tipo]) : tipo}
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
                    <video
                      src={video}
                      className="w-full h-full object-cover"
                      controls
                      muted
                      playsInline
                    />
                  );
                }
                if (mediaSrc) {
                  return (
                    <img
                      src={mediaSrc}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  );
                }
                return (
                  <div className="text-white/20 text-[10px] uppercase tracking-widest">
                    {t("modalPreview.noVideoImage")}
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
                  <img
                    src={mediaSrc}
                    alt="item"
                    className="max-w-full max-h-[140px] object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10" />
                )}
              </div>

              {p.cupom && (
                <div className="px-2 pb-2">
                  <div className="flex items-center gap-2 rounded-md bg-[#ef6f88] p-2 shadow-md">
                    <div className="flex-shrink-0 w-11 h-11 rounded bg-black/30 border border-white/20 flex items-center justify-center overflow-hidden">
                      {mediaSrc ? (
                        <img
                          src={mediaSrc}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-center">
                      <div className="text-[9px] font-black uppercase tracking-widest text-white/90 leading-tight">
                        {t("common.coupon")}
                      </div>
                      <div className="text-[12px] font-black text-white leading-tight truncate">
                        {p.cupom}
                      </div>
                      <div className="mt-1 inline-block rounded-full bg-white/30 px-2 py-[2px] text-[9px] font-bold text-white">
                        {t("modalPreview.copyCoupon")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-2 pb-2 text-center">
                {p.preco_total && p.preco_desconto && (
                  <div className="text-[9px] text-white/60 mb-0.5">
                    {t("modalPreview.save", {
                      amount: Math.max(
                        0,
                        Number(String(p.preco_total).replace(/\D/g, "")) -
                          Number(String(p.preco_desconto).replace(/\D/g, "")),
                      ),
                    })}
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
        <h3 className="text-lg font-bold text-white">
          {t("modalPreview.title")}
        </h3>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#141414] to-[#0a0a0a] p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
            {TIPO_LABEL_KEYS[tipo] ? t(TIPO_LABEL_KEYS[tipo]) : tipo}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              isActive
                ? "bg-[#e5c12f] shadow-[0_0_8px_#e5c12f]"
                : "bg-red-500 shadow-[0_0_8px_#ef4444]"
            }`}
          />
        </div>

        {/* Image */}
        <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/60 border border-white/5 mb-4 flex items-center justify-center">
          {image ? (
            <img
              src={image}
              alt="preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-white/20 text-xs uppercase tracking-widest">
              {t("modalPreview.noImage")}
            </div>
          )}
        </div>

        {/* Body per tipo */}
        <div className="space-y-3">
          {tipo === "vip_mensal" && (
            <>
              <Block label={t("common.name")}>
                {p.nome || (
                  <em className="text-white/30">
                    {t("modalPreview.vipNamePlaceholder")}
                  </em>
                )}
              </Block>
              <Block label={t("common.coupon")}>
                <span className="text-[#e5c12f] font-bold">
                  {p.cupom || t("modalPreview.couponPlaceholder")}
                </span>
              </Block>
              {p.descricao && (
                <Block label={t("common.description")}>
                  {renderHtml(p.descricao)}
                </Block>
              )}
              {p.validade && (
                <Block label={t("common.validity")}>{p.validade}</Block>
              )}
            </>
          )}

          {tipo === "oferta_flash" && (
            <>
              <Block label={t("common.title")}>
                {p.titulo || (
                  <em className="text-white/30">
                    {t("modalPreview.titlePlaceholder")}
                  </em>
                )}
              </Block>
              {p.subtitulo && (
                <Block label={t("common.subtitle")}>{p.subtitulo}</Block>
              )}
              {p.produto && (
                <Block label={t("common.product")}>{p.produto}</Block>
              )}
              <div className="flex items-baseline gap-3 px-1">
                {p.preco_antigo && (
                  <span className="text-white/40 line-through text-sm">
                    {p.preco_antigo}
                  </span>
                )}
                {p.preco && (
                  <span className="text-[#e5c12f] font-black text-2xl">
                    {p.preco}
                  </span>
                )}
              </div>
              {p.duracao && (
                <Block label={t("common.duration")}>{p.duracao}</Block>
              )}
            </>
          )}

          {tipo === "battlepass" && (
            <>
              <Block label="BattlePass">
                {p.nome || (
                  <em className="text-white/30">
                    {t("modalPreview.passNamePlaceholder")}
                  </em>
                )}
              </Block>
              {p.descricao && (
                <Block label={t("common.description")}>
                  {renderHtml(p.descricao)}
                </Block>
              )}
            </>
          )}

          {tipo === "link_exclusivo" && (
            <div className="text-white/60 text-xs text-center py-2">
              {t("modalPreview.exclusiveLink")}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            className="py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/80"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="py-3 rounded-xl bg-[#e5c12f] text-black text-[11px] font-black uppercase tracking-widest"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </aside>
  );
}
