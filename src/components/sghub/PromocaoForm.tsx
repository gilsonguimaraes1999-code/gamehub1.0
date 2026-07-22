import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2, Upload, Info, Layers, LinkIcon } from "lucide-react";
import type { Local, Promocao, LinkPorCidade } from "@/lib/sghub-api";
import { uploadImage } from "@/lib/sghub-api";
import ModalPreview from "@/components/sghub/ModalPreview";

const TIPOS = [
  { value: "vip_mensal", label: "VIP Mensal" },
  { value: "oferta_flash", label: "Oferta Flash" },
  { value: "link_exclusivo", label: "Link Exclusivo" },
  { value: "battlepass", label: "BattlePass Informação" },
  { value: "oferta_cidade", label: "Oferta da Cidade" },
];

interface Props {
  initial?: Partial<Promocao>;
  locais: Local[];
  submitting?: boolean;
  onSubmit: (p: Partial<Promocao>) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

const inputCls =
  "w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#e5c12f] transition-all";
const labelCls =
  "block text-[10px] font-black uppercase tracking-widest text-[#a8a8a8] mb-2";

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  trailing,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? `Digite ${label.toLowerCase()}...`}
          className={`${inputCls} ${trailing ? "pr-12" : ""} ${error ? "border-red-500 focus:ring-red-500" : ""}`}
        />
        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
    </div>
  );
}

function ImageUploadButton({
  uploading,
  onFile,
}: {
  uploading: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <label
      title={uploading ? "Enviando..." : "Enviar imagem"}
      className="cursor-pointer inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-[#e5c12f] hover:border-[#e5c12f]/50 transition-all"
    >
      <Upload size={14} className={uploading ? "animate-pulse" : ""} />
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}


export default function PromocaoForm({
  initial,
  locais,
  submitting,
  onSubmit,
  onCancel,
  submitLabel = "Salvar Promoção",
}: Props) {
  const [state, setState] = useState<Partial<Promocao>>({
    tipo: initial?.tipo || "vip_mensal",
    status: initial?.status || "ativo",
    nome: initial?.nome || "",
    nome_interno: initial?.nome_interno || "",
    cupom: initial?.cupom || "",
    validade: initial?.validade || "",
    descricao: initial?.descricao || "",
    imagem: initial?.imagem || "",
    titulo: initial?.titulo || "",
    subtitulo: initial?.subtitulo || "",
    produto: initial?.produto || "",
    preco: initial?.preco || "",
    preco_antigo: initial?.preco_antigo || "",
    duracao: initial?.duracao || "",
    miniatura: initial?.miniatura || "",
    texto_botao: initial?.texto_botao || "",
    preco_total: initial?.preco_total || "",
    preco_desconto: initial?.preco_desconto || "",
    percentual_desconto: initial?.percentual_desconto || "",
    video: initial?.video || "",
    link: initial?.link || "",
    links_por_cidade: initial?.links_por_cidade || [],
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadingCity, setUploadingCity] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string>(locais[0]?.id || "");

  const update = (patch: Partial<Promocao>) => setState((s) => ({ ...s, ...patch }));

  const links: LinkPorCidade[] = useMemo(
    () => state.links_por_cidade || [],
    [state.links_por_cidade]
  );

  const upsertLink = (countryId: string, cityId: string, patch: Partial<Omit<LinkPorCidade, "countryId" | "cityId">>) => {
    setState((s) => {
      const prev = s.links_por_cidade || [];
      const idx = prev.findIndex((l) => l.countryId === countryId && l.cityId === cityId);
      const next = [...prev];
      const merged: LinkPorCidade = {
        countryId,
        cityId,
        url: (patch.url ?? (idx !== -1 ? prev[idx].url : "") ?? "").trim(),
        imagem: patch.imagem ?? (idx !== -1 ? prev[idx].imagem : ""),
      };
      const empty = !merged.url && !merged.imagem;
      if (empty) {
        if (idx !== -1) next.splice(idx, 1);
      } else if (idx === -1) {
        next.push(merged);
      } else {
        next[idx] = merged;
      }
      return { ...s, links_por_cidade: next };
    });
  };

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem maior que 5MB.");
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
      const url = await uploadImage(dataUrl);
      update({ imagem: url });
      toast.success("Imagem enviada.");
    } catch (e) {
      toast.error((e as Error).message || "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleCityFile = async (countryId: string, cityId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem maior que 5MB.");
    const key = `${countryId}:${cityId}`;
    setUploadingCity(key);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
      const url = await uploadImage(dataUrl);
      upsertLink(countryId, cityId, { imagem: url });
      toast.success("Imagem enviada.");
    } catch (e) {
      toast.error((e as Error).message || "Falha no upload.");
    } finally {
      setUploadingCity(null);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, boolean> = {};
    if (!state.nome_interno?.trim()) errs.nome_interno = true;
    if (state.tipo === "vip_mensal" && !state.nome?.trim()) errs.nome = true;
    if (state.tipo === "oferta_flash" && !state.titulo?.trim()) errs.titulo = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return toast.error("Preencha os campos obrigatórios.");
    await onSubmit(state);
  };

  const country = locais.find((c) => c.id === activeCountry) || locais[0];

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* top actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="px-6 py-2 bg-[#e5c12f] text-black rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {submitting ? "Salvando..." : submitLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#111] p-6 sm:p-8 rounded-2xl border border-white/5 space-y-10 shadow-2xl">
        {/* Informações Gerais */}
        <section className="space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2 text-white">
            <Info size={18} className="text-[#e5c12f]" /> Informações Gerais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field
              label="Nome Interno (Painel)"
              value={state.nome_interno}
              onChange={(v) => update({ nome_interno: v })}
              placeholder="Ex: Oferta Natal 2026"
              error={errors.nome_interno}
            />
            <div className="space-y-2">
              <label className={labelCls}>Tipo de Promoção</label>
              <select
                value={state.tipo}
                onChange={(e) => update({ tipo: e.target.value })}
                className={`${inputCls} appearance-none`}
              >
                {TIPOS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelCls}>Status</label>
              <select
                value={state.status}
                onChange={(e) => update({ status: e.target.value })}
                className={`${inputCls} appearance-none`}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </section>

        {/* Conteúdo do Modal */}
        <section className="space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2 text-white">
            <Layers size={18} className="text-[#e5c12f]" /> Conteúdo do Modal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {state.tipo === "vip_mensal" && (
              <>
                <Field label="Nome do VIP Mensal" value={state.nome} onChange={(v) => update({ nome: v })} error={errors.nome} />
                <Field label="Cupom do VIP Mensal" value={state.cupom} onChange={(v) => update({ cupom: v })} />
                <div className="md:col-span-2 space-y-2">
                  <label className={labelCls}>Descrição do VIP Mensal</label>
                  <textarea
                    value={state.descricao ?? ""}
                    onChange={(e) => update({ descricao: e.target.value })}
                    placeholder="Detalhes da promoção..."
                    className={`${inputCls} h-24 resize-none`}
                  />
                </div>
                <Field label="Validade do VIP Mensal" value={state.validade} onChange={(v) => update({ validade: v })} />
                <Field label="Link do VIP Mensal" value={state.link ?? ""} onChange={(v) => update({ link: v })} />
                <div className="md:col-span-2">
                  <Field label="Imagem do VIP Mensal" value={state.imagem} onChange={(v) => update({ imagem: v })} trailing={<ImageUploadButton uploading={uploading} onFile={handleFile} />} />
                </div>
              </>
            )}


            {state.tipo === "oferta_flash" && (
              <>
                <Field label="Título da Oferta Flash" value={state.titulo} onChange={(v) => update({ titulo: v })} error={errors.titulo} />
                <Field label="Subtítulo da Oferta Flash" value={state.subtitulo} onChange={(v) => update({ subtitulo: v })} />
                <div className="md:col-span-2">
                  <Field label="Produto da Oferta Flash" value={state.produto} onChange={(v) => update({ produto: v })} />
                </div>
                <Field label="Preço Antigo da Oferta Flash" value={state.preco_antigo} onChange={(v) => update({ preco_antigo: v })} />
                <Field label="Preço da Oferta Flash" value={state.preco} onChange={(v) => update({ preco: v })} />
                <div className="md:col-span-2">
                  <Field label="Link da Oferta Flash" value={state.link ?? ""} onChange={(v) => update({ link: v })} />
                </div>
                <Field label="Duração da Oferta Flash" value={state.duracao} onChange={(v) => update({ duracao: v })} />
                <Field label="Imagem da Oferta Flash" value={state.imagem} onChange={(v) => update({ imagem: v })} trailing={<ImageUploadButton uploading={uploading} onFile={handleFile} />} />
              </>
            )}


            {state.tipo === "battlepass" && (
              <>
                <div className="md:col-span-2">
                  <Field label="BattlePass Imagem" value={state.imagem} onChange={(v) => update({ imagem: v })} trailing={<ImageUploadButton uploading={uploading} onFile={handleFile} />} />
                </div>
                <Field label="BattlePass Nome" value={state.nome} onChange={(v) => update({ nome: v })} />
                <Field label="BattlePass URL Botão" value={state.link ?? ""} onChange={(v) => update({ link: v })} />
                <div className="md:col-span-2 space-y-2">
                  <label className={labelCls}>BattlePass Descrição</label>
                  <textarea
                    value={state.descricao ?? ""}
                    onChange={(e) => update({ descricao: e.target.value })}
                    placeholder="Detalhes da promoção..."
                    className={`${inputCls} h-24 resize-none`}
                  />
                </div>
                <div className="md:col-span-2">
                  <Field label="BattlePass Miniatura Imagem" value={state.miniatura} onChange={(v) => update({ miniatura: v })} />
                </div>
              </>
            )}


            {state.tipo === "link_exclusivo" && (
              <div className="md:col-span-2">
                <Field label="Imagem do Link" value={state.imagem} onChange={(v) => update({ imagem: v })} trailing={<ImageUploadButton uploading={uploading} onFile={handleFile} />} />
              </div>
            )}

            {state.tipo === "oferta_cidade" && (
              <>
                <Field label="Texto do Botão da Oferta da Cidade" value={state.texto_botao} onChange={(v) => update({ texto_botao: v })} />
                <Field label="Preço Total da Oferta da Cidade" value={state.preco_total} onChange={(v) => update({ preco_total: v })} />
                <Field label="Preço com Desconto da Oferta da Cidade" value={state.preco_desconto} onChange={(v) => update({ preco_desconto: v })} />
                <Field label="Percentual de Desconto da Oferta da Cidade" value={state.percentual_desconto} onChange={(v) => update({ percentual_desconto: v })} />
                <Field label="Título da Oferta da Cidade" value={state.titulo} onChange={(v) => update({ titulo: v })} />
                <Field label="Vídeo da Oferta da Cidade" value={state.video} onChange={(v) => update({ video: v })} placeholder="https://youtube.com/..." />
                <Field label="Cupom da Oferta da Cidade" value={state.cupom} onChange={(v) => update({ cupom: v })} />
              </>
            )}

          </div>

          {/* Preview thumbnail */}
          {state.imagem && (
            <div className="flex items-center gap-3 pt-2">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                <img src={state.imagem} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => update({ imagem: "" })}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {uploading && (
                <span className="text-[10px] font-black uppercase tracking-widest text-[#e5c12f]">Enviando...</span>
              )}
            </div>
          )}
        </section>

        {/* Loja & Imagem por Cidade */}
        <section className="space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2 text-white">
            <LinkIcon size={18} className="text-[#e5c12f]" />
            {state.tipo === "oferta_cidade" ? "Loja & Imagem por Cidade" : "Canais de Venda (Links)"}
          </h3>

          {locais.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-white/50 text-sm">
              Nenhum país cadastrado. Vá em <b className="text-[#e5c12f]">Gerenciar Locais</b>.
            </div>
          ) : (
            <>
              <div className="flex bg-black rounded-lg p-1 border border-white/10 overflow-x-auto">
                {locais.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCountry(c.id)}
                    className={`flex-1 min-w-[120px] py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${
                      activeCountry === c.id
                        ? "bg-[#e5c12f] text-black"
                        : "text-[#a8a8a8] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {country?.cidades?.length ? (
                  country.cidades.map((h) => {
                    const cur = links.find((l) => l.countryId === country.id && l.cityId === h.id);
                    const key = `${country.id}:${h.id}`;
                    const isUp = uploadingCity === key;
                    return (
                      <div key={h.id} className="bg-white/5 p-4 rounded-xl space-y-3 border border-white/5">
                        <label className="text-[10px] font-black uppercase text-[#a8a8a8] tracking-tighter opacity-70 px-1">
                          {h.nome}
                        </label>
                        <input
                          value={cur?.url || ""}
                          onChange={(e) => upsertLink(country.id, h.id, { url: e.target.value })}
                          placeholder="https:// ... (link da loja)"
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#e5c12f] font-mono"
                        />
                        {state.tipo === "oferta_cidade" && (
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                value={cur?.imagem || ""}
                                onChange={(e) => upsertLink(country.id, h.id, { imagem: e.target.value })}
                                placeholder="https:// ... (imagem da oferta)"
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-4 pr-11 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#e5c12f] font-mono"
                              />
                              <label
                                title={isUp ? "Enviando..." : "Enviar imagem"}
                                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer inline-flex items-center justify-center w-6 h-6 text-white/60 hover:text-[#e5c12f] transition-colors"
                              >
                                <Upload size={13} className={isUp ? "animate-pulse" : ""} />
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => e.target.files?.[0] && handleCityFile(country.id, h.id, e.target.files[0])}
                                />
                              </label>
                            </div>
                            {cur?.imagem && (
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                <img src={cur.imagem} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-white/40 text-xs sm:col-span-2">Sem cidades neste país.</p>
                )}
              </div>
            </>
          )}
        </section>
        </div>
        <div>
          <ModalPreview p={state} />
        </div>
      </div>
    </form>
  );
}
