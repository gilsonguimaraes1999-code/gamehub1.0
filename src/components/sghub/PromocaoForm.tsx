import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { enUS, es, ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Trash2,
  Upload,
  Info,
  Layers,
  LinkIcon,
} from "lucide-react";
import type { Local, Promocao, LinkPorCidade } from "@/lib/sghub-api";
import { uploadImage } from "@/lib/sghub-api";
import ModalPreview from "@/components/sghub/ModalPreview";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { getPromotionValidationErrors } from "@/lib/promotion-validation";
import {
  combineLocalDateTime,
  parseLocalDateTime,
  preparePromotionForSubmit,
  promotionUsesSalesChannels,
} from "@/lib/promotion-types";

const TIPOS = [
  { value: "vip_mensal", labelKey: "promotion.type.vip_mensal" },
  { value: "oferta_flash", labelKey: "promotion.type.oferta_flash" },
  { value: "link_exclusivo", labelKey: "promotion.type.link_exclusivo" },
  { value: "battlepass", labelKey: "promotion.type.battlepassInfo" },
  { value: "oferta_cidade", labelKey: "promotion.type.oferta_cidade" },
  { value: "cupom", labelKey: "promotion.type.cupom" },
  { value: "colecao_vip", labelKey: "promotion.type.colecao_vip" },
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
  defaultPlaceholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  trailing?: React.ReactNode;
  defaultPlaceholder?: (label: string) => string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          value={value ?? ""}
          type={type}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ??
            (defaultPlaceholder ? defaultPlaceholder(label.toLowerCase()) : "")
          }
          className={`${inputCls} ${trailing ? "pr-12" : ""} ${error ? "border-red-500 focus:ring-red-500" : ""}`}
        />
        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}

function ImageUploadButton({
  uploading,
  onFile,
  uploadTitle,
  uploadingTitle,
}: {
  uploading: boolean;
  onFile: (f: File) => void;
  uploadTitle: string;
  uploadingTitle: string;
}) {
  return (
    <label
      title={uploading ? uploadingTitle : uploadTitle}
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

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const { t, language } = useI18n();
  const parsed = parseLocalDateTime(value);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>(parsed.date);
  const [draftHour, setDraftHour] = useState(parsed.hour);
  const [draftMinute, setDraftMinute] = useState(parsed.minute);
  const [draftSecond, setDraftSecond] = useState(parsed.second);

  const openCalendar = (nextOpen: boolean) => {
    if (nextOpen) {
      const current = parseLocalDateTime(value);
      setDraftDate(current.date);
      setDraftHour(current.hour);
      setDraftMinute(current.minute);
      setDraftSecond(current.second);
    }
    setOpen(nextOpen);
  };

  const formattedValue = parsed.date
    ? `${String(parsed.date.getDate()).padStart(2, "0")}/${String(parsed.date.getMonth() + 1).padStart(2, "0")}/${parsed.date.getFullYear()} ${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}:${String(parsed.second).padStart(2, "0")}`
    : "dd/mm/aaaa --:--:--";

  const saveDraft = (
    date = draftDate,
    hour = draftHour,
    minute = draftMinute,
    second = draftSecond,
  ) => {
    if (date) onChange(combineLocalDateTime(date, hour, minute, second));
  };

  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      <Popover open={open} onOpenChange={openCalendar}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={`${inputCls} flex items-center justify-between text-left ${parsed.date ? "text-white" : "text-white/45"}`}
          >
            <span>{formattedValue}</span>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e5c12f]/50 bg-[#e5c12f]/10 text-[#e5c12f]">
              <CalendarDays size={17} />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[268px] overflow-hidden border-[#e5c12f]/55 bg-[#151515] p-0 text-white shadow-[0_18px_60px_rgba(0,0,0,.65)]"
        >
          <Calendar
            mode="single"
            showOutsideDays={false}
            locale={language === "en" ? enUS : language === "es" ? es : ptBR}
            selected={draftDate}
            onSelect={(date) => {
              setDraftDate(date);
              saveDraft(date);
            }}
            defaultMonth={draftDate}
            formatters={{
              formatWeekdayName: (date) =>
                date.toLocaleDateString(language, { weekday: "narrow" }),
              formatCaption: (date) => {
                const month = date
                  .toLocaleDateString(language, { month: "short" })
                  .replace(".", "");
                return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
              },
            }}
            className="w-full bg-[#151515] p-3 [--cell-size:2.15rem]"
            classNames={{
              root: "w-full",
              month: "w-full",
              nav: "absolute inset-x-0 top-0 flex h-8 w-full items-center justify-between",
              month_caption: "flex h-8 w-full items-center justify-center px-8",
              caption_label:
                "flex h-8 items-center justify-center text-white font-bold capitalize leading-none",
              weekdays: "grid w-full grid-cols-7",
              weekday:
                "flex items-center justify-center text-white/40 font-black text-[10px]",
              week: "grid w-full grid-cols-7",
              day_button:
                "text-white/80 hover:bg-[#e5c12f]/10 hover:text-[#f9e29f] data-[selected-single=true]:!bg-transparent data-[selected-single=true]:!text-[#e5c12f] data-[selected-single=true]:font-black data-[selected-single=true]:!ring-0",
              today: "rounded-md text-[#f9e29f]",
              button_previous:
                "text-white/60 hover:bg-[#e5c12f]/10 hover:text-[#e5c12f]",
              button_next:
                "text-white/60 hover:bg-[#e5c12f]/10 hover:text-[#e5c12f]",
              outside: "text-white/20",
            }}
          />
          <div className="grid grid-cols-3 gap-2 border-t border-white/10 px-3 py-3">
            <TimeInput
              label={t("promotion.calendar.hour")}
              value={draftHour}
              max={23}
              onChange={(next) => {
                setDraftHour(next);
                saveDraft(draftDate, next, draftMinute, draftSecond);
              }}
            />
            <TimeInput
              label={t("promotion.calendar.minuteShort")}
              value={draftMinute}
              max={59}
              onChange={(next) => {
                setDraftMinute(next);
                saveDraft(draftDate, draftHour, next, draftSecond);
              }}
            />
            <TimeInput
              label={t("promotion.calendar.secondShort")}
              value={draftSecond}
              max={59}
              onChange={(next) => {
                setDraftSecond(next);
                saveDraft(draftDate, draftHour, draftMinute, next);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TimeInput({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-center text-[9px] font-black uppercase tracking-widest text-white/40">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(event) =>
          onChange(Math.min(max, Math.max(0, Number(event.target.value) || 0)))
        }
        className="h-9 w-full appearance-none rounded-lg border border-white/15 bg-[#222] px-2 text-center text-xs font-bold text-white outline-none transition focus:border-[#e5c12f] focus:ring-1 focus:ring-[#e5c12f] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
  submitLabel,
}: Props) {
  const { t } = useI18n();
  const finalSubmitLabel = submitLabel || t("promotion.form.defaultSubmit");
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
    categoria: initial?.categoria || "",
    valor_minimo: initial?.valor_minimo || "",
    data_inicio: initial?.data_inicio || "",
    data_expiracao: initial?.data_expiracao || "",
    video: initial?.video || "",
    link: initial?.link || "",
    links_por_cidade: initial?.links_por_cidade || [],
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadingCity, setUploadingCity] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string>(
    locais[0]?.id || "",
  );

  const update = (patch: Partial<Promocao>) =>
    setState((s) => ({ ...s, ...patch }));

  const links: LinkPorCidade[] = useMemo(
    () => state.links_por_cidade || [],
    [state.links_por_cidade],
  );

  const upsertLink = (
    countryId: string,
    cityId: string,
    patch: Partial<Omit<LinkPorCidade, "countryId" | "cityId">>,
  ) => {
    setState((s) => {
      const prev = s.links_por_cidade || [];
      const idx = prev.findIndex(
        (l) => l.countryId === countryId && l.cityId === cityId,
      );
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
    if (file.size > 5 * 1024 * 1024)
      return toast.error(t("promotion.form.bigImage"));
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
      toast.success(t("promotion.form.imageSent"));
    } catch (e) {
      toast.error((e as Error).message || t("promotion.form.uploadFail"));
    } finally {
      setUploading(false);
    }
  };

  const handleCityFile = async (
    countryId: string,
    cityId: string,
    file: File,
  ) => {
    if (file.size > 5 * 1024 * 1024)
      return toast.error(t("promotion.form.bigImage"));
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
      toast.success(t("promotion.form.imageSent"));
    } catch (e) {
      toast.error((e as Error).message || t("promotion.form.uploadFail"));
    } finally {
      setUploadingCity(null);
    }
  };

  const validate = (): boolean => {
    const errs = getPromotionValidationErrors(state);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return toast.error(t("promotion.form.required"));
    await onSubmit(preparePromotionForSubmit(state));
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
            {t("common.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="px-6 py-2 bg-[#e5c12f] text-black rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {submitting ? t("common.saving") : finalSubmitLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#111] p-6 sm:p-8 rounded-2xl border border-white/5 space-y-10 shadow-2xl">
          {/* Informações Gerais */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2 text-white">
              <Info size={18} className="text-[#e5c12f]" />{" "}
              {t("promotion.form.general")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                label={t("promotion.form.internalName")}
                value={state.nome_interno}
                onChange={(v) => update({ nome_interno: v })}
                placeholder={t("promotion.form.internalNamePlaceholder")}
                error={errors.nome_interno}
                defaultPlaceholder={(label) =>
                  t("promotion.form.defaultPlaceholder", { label })
                }
              />
              <div className="space-y-2">
                <label className={labelCls}>{t("promotion.form.type")}</label>
                <select
                  value={state.tipo}
                  onChange={(e) => update({ tipo: e.target.value })}
                  className={`${inputCls} appearance-none`}
                >
                  {TIPOS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>{t("common.status")}</label>
                <select
                  value={state.status}
                  onChange={(e) => update({ status: e.target.value })}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="ativo">{t("common.active")}</option>
                  <option value="inativo">{t("common.inactive")}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Conteúdo do Modal */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2 text-white">
              <Layers size={18} className="text-[#e5c12f]" />{" "}
              {t("promotion.form.modalContent")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {state.tipo === "vip_mensal" && (
                <>
                  <Field
                    label={t("promotion.form.vipName")}
                    value={state.nome}
                    onChange={(v) => update({ nome: v })}
                    error={errors.nome}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.vipCoupon")}
                    value={state.cupom}
                    onChange={(v) => update({ cupom: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <div className="md:col-span-2 space-y-2">
                    <label className={labelCls}>
                      {t("promotion.form.vipDescription")}
                    </label>
                    <textarea
                      value={state.descricao ?? ""}
                      onChange={(e) => update({ descricao: e.target.value })}
                      placeholder={t("promotion.form.detailsPlaceholder")}
                      className={`${inputCls} h-24 resize-none`}
                    />
                  </div>
                  <Field
                    label={t("promotion.form.vipValidity")}
                    value={state.validade}
                    onChange={(v) => update({ validade: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.vipLink")}
                    value={state.link ?? ""}
                    onChange={(v) => update({ link: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <div className="md:col-span-2">
                    <Field
                      label={t("promotion.form.vipImage")}
                      value={state.imagem}
                      onChange={(v) => update({ imagem: v })}
                      trailing={
                        <ImageUploadButton
                          uploading={uploading}
                          onFile={handleFile}
                          uploadTitle={t("promotion.form.uploadImage")}
                          uploadingTitle={t("common.uploading")}
                        />
                      }
                      defaultPlaceholder={(label) =>
                        t("promotion.form.defaultPlaceholder", { label })
                      }
                    />
                  </div>
                </>
              )}

              {state.tipo === "oferta_flash" && (
                <>
                  <Field
                    label={t("promotion.form.flashTitle")}
                    value={state.titulo}
                    onChange={(v) => update({ titulo: v })}
                    error={errors.titulo}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.flashSubtitle")}
                    value={state.subtitulo}
                    onChange={(v) => update({ subtitulo: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <div className="md:col-span-2">
                    <Field
                      label={t("promotion.form.flashProduct")}
                      value={state.produto}
                      onChange={(v) => update({ produto: v })}
                      defaultPlaceholder={(label) =>
                        t("promotion.form.defaultPlaceholder", { label })
                      }
                    />
                  </div>
                  <Field
                    label={t("promotion.form.flashOldPrice")}
                    value={state.preco_antigo}
                    onChange={(v) => update({ preco_antigo: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.flashPrice")}
                    value={state.preco}
                    onChange={(v) => update({ preco: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <div className="md:col-span-2">
                    <Field
                      label={t("promotion.form.flashLink")}
                      value={state.link ?? ""}
                      onChange={(v) => update({ link: v })}
                      defaultPlaceholder={(label) =>
                        t("promotion.form.defaultPlaceholder", { label })
                      }
                    />
                  </div>
                  <Field
                    label={t("promotion.form.flashDuration")}
                    value={state.duracao}
                    onChange={(v) => update({ duracao: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.flashImage")}
                    value={state.imagem}
                    onChange={(v) => update({ imagem: v })}
                    trailing={
                      <ImageUploadButton
                        uploading={uploading}
                        onFile={handleFile}
                        uploadTitle={t("promotion.form.uploadImage")}
                        uploadingTitle={t("common.uploading")}
                      />
                    }
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                </>
              )}

              {state.tipo === "battlepass" && (
                <>
                  <div className="md:col-span-2">
                    <Field
                      label={t("promotion.form.battleImage")}
                      value={state.imagem}
                      onChange={(v) => update({ imagem: v })}
                      trailing={
                        <ImageUploadButton
                          uploading={uploading}
                          onFile={handleFile}
                          uploadTitle={t("promotion.form.uploadImage")}
                          uploadingTitle={t("common.uploading")}
                        />
                      }
                      defaultPlaceholder={(label) =>
                        t("promotion.form.defaultPlaceholder", { label })
                      }
                    />
                  </div>
                  <Field
                    label={t("promotion.form.battleName")}
                    value={state.nome}
                    onChange={(v) => update({ nome: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.battleButtonUrl")}
                    value={state.link ?? ""}
                    onChange={(v) => update({ link: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <div className="md:col-span-2 space-y-2">
                    <label className={labelCls}>
                      {t("promotion.form.battleDescription")}
                    </label>
                    <textarea
                      value={state.descricao ?? ""}
                      onChange={(e) => update({ descricao: e.target.value })}
                      placeholder={t("promotion.form.detailsPlaceholder")}
                      className={`${inputCls} h-24 resize-none`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Field
                      label={t("promotion.form.battleThumb")}
                      value={state.miniatura}
                      onChange={(v) => update({ miniatura: v })}
                      defaultPlaceholder={(label) =>
                        t("promotion.form.defaultPlaceholder", { label })
                      }
                    />
                  </div>
                </>
              )}

              {state.tipo === "link_exclusivo" && (
                <div className="md:col-span-2">
                  <Field
                    label={t("promotion.form.linkImage")}
                    value={state.imagem}
                    onChange={(v) => update({ imagem: v })}
                    trailing={
                      <ImageUploadButton
                        uploading={uploading}
                        onFile={handleFile}
                        uploadTitle={t("promotion.form.uploadImage")}
                        uploadingTitle={t("common.uploading")}
                      />
                    }
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                </div>
              )}

              {state.tipo === "oferta_cidade" && (
                <>
                  <Field
                    label={t("promotion.form.cityButtonText")}
                    value={state.texto_botao}
                    onChange={(v) => update({ texto_botao: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.cityTotalPrice")}
                    value={state.preco_total}
                    onChange={(v) => update({ preco_total: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.cityDiscountPrice")}
                    value={state.preco_desconto}
                    onChange={(v) => update({ preco_desconto: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.cityDiscountPercent")}
                    value={state.percentual_desconto}
                    onChange={(v) => update({ percentual_desconto: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.cityTitle")}
                    value={state.titulo}
                    onChange={(v) => update({ titulo: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                  <Field
                    label={t("promotion.form.cityVideo")}
                    value={state.video}
                    onChange={(v) => update({ video: v })}
                    placeholder="https://youtube.com/..."
                  />
                  <Field
                    label={t("promotion.form.cityCoupon")}
                    value={state.cupom}
                    onChange={(v) => update({ cupom: v })}
                    defaultPlaceholder={(label) =>
                      t("promotion.form.defaultPlaceholder", { label })
                    }
                  />
                </>
              )}

              {state.tipo === "cupom" && (
                <>
                  <Field
                    label={t("promotion.form.couponCode")}
                    value={state.cupom}
                    onChange={(v) => update({ cupom: v.toUpperCase() })}
                    error={errors.cupom}
                    maxLength={64}
                    placeholder="NOBRE"
                  />
                  <Field
                    label={t("promotion.form.couponCategory")}
                    value={state.categoria}
                    onChange={(v) => update({ categoria: v })}
                    error={errors.categoria}
                    placeholder={t("promotion.form.couponCategoryPlaceholder")}
                  />
                  <Field
                    label={t("promotion.form.couponDiscount")}
                    value={state.percentual_desconto}
                    onChange={(v) =>
                      update({
                        percentual_desconto: v.replace(/[^0-9.,]/g, ""),
                      })
                    }
                    error={errors.percentual_desconto}
                    type="text"
                    placeholder="30"
                  />
                  <Field
                    label={t("promotion.form.couponProductLink")}
                    value={state.link}
                    onChange={(v) => update({ link: v })}
                    error={errors.link}
                    placeholder="https://..."
                  />
                  <Field
                    label={t("promotion.form.couponMinimum")}
                    value={state.valor_minimo}
                    onChange={(v) => update({ valor_minimo: v })}
                    type="number"
                    placeholder="0,00"
                  />
                  <DateTimeField
                    label={t("promotion.form.couponStart")}
                    value={state.data_inicio}
                    onChange={(v) => update({ data_inicio: v })}
                  />
                  <DateTimeField
                    label={t("promotion.form.couponExpiration")}
                    value={state.data_expiracao}
                    onChange={(v) => update({ data_expiracao: v })}
                  />
                </>
              )}

              {state.tipo === "colecao_vip" && (
                <>
                  <Field
                    label={t("promotion.form.vipCollectionTitle")}
                    value={state.titulo}
                    onChange={(v) => update({ titulo: v })}
                    error={errors.titulo}
                    maxLength={120}
                    placeholder="VIP Chefão"
                  />
                  <div className="md:col-span-2 space-y-2">
                    <label className={labelCls}>
                      {t("promotion.form.vipCollectionDescription")}
                    </label>
                    <textarea
                      value={state.descricao ?? ""}
                      onChange={(event) =>
                        update({ descricao: event.target.value })
                      }
                      className={`${inputCls} h-28 resize-none ${errors.descricao ? "border-red-500 focus:ring-red-500" : ""}`}
                      placeholder={t("promotion.form.detailsPlaceholder")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Field
                      label={t("promotion.form.vipCollectionBanner")}
                      value={state.imagem}
                      onChange={(v) => update({ imagem: v })}
                      error={errors.imagem}
                      trailing={
                        <ImageUploadButton
                          uploading={uploading}
                          onFile={handleFile}
                          uploadTitle={t("promotion.form.uploadImage")}
                          uploadingTitle={t("common.uploading")}
                        />
                      }
                      placeholder="https://iili.io/banner.png"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Preview thumbnail */}
            {state.imagem && state.tipo !== "cupom" && (
              <div className="flex items-center gap-3 pt-2">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={state.imagem}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => update({ imagem: "" })}
                    className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {uploading && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#e5c12f]">
                    {t("common.uploading")}
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Loja & Imagem por Cidade */}
          {promotionUsesSalesChannels(state.tipo) && (
            <section className="space-y-6">
              <h3 className="text-lg font-bold border-b border-white/5 pb-2 flex items-center gap-2 text-white">
                <LinkIcon size={18} className="text-[#e5c12f]" />
                {state.tipo === "oferta_cidade"
                  ? t("promotion.form.storeImageByCity")
                  : state.tipo === "colecao_vip"
                    ? t("promotion.form.vipCollectionSalesChannels")
                    : t("promotion.form.salesChannels")}
              </h3>

              {locais.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-white/50 text-sm">
                  {t("promotion.form.noCountry")}
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

                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl ${errors.links_por_cidade ? "ring-2 ring-red-500 p-2" : ""}`}
                  >
                    {country?.cidades?.length ? (
                      country.cidades.map((h) => {
                        const cur = links.find(
                          (l) =>
                            l.countryId === country.id && l.cityId === h.id,
                        );
                        const key = `${country.id}:${h.id}`;
                        const isUp = uploadingCity === key;
                        return (
                          <div
                            key={h.id}
                            className="bg-white/5 p-4 rounded-xl space-y-3 border border-white/5"
                          >
                            <label className="text-[10px] font-black uppercase text-[#a8a8a8] tracking-tighter opacity-70 px-1">
                              {h.nome}
                            </label>
                            <input
                              value={cur?.url || ""}
                              onChange={(e) =>
                                upsertLink(country.id, h.id, {
                                  url: e.target.value,
                                })
                              }
                              placeholder={
                                state.tipo === "colecao_vip"
                                  ? t(
                                      "promotion.form.vipCollectionTebexPlaceholder",
                                    )
                                  : t("promotion.form.storeLinkPlaceholder")
                              }
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#e5c12f] font-mono"
                            />
                            {state.tipo === "oferta_cidade" && (
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    value={cur?.imagem || ""}
                                    onChange={(e) =>
                                      upsertLink(country.id, h.id, {
                                        imagem: e.target.value,
                                      })
                                    }
                                    placeholder={t(
                                      "promotion.form.offerImagePlaceholder",
                                    )}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-4 pr-11 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#e5c12f] font-mono"
                                  />
                                  <label
                                    title={
                                      isUp
                                        ? t("common.uploading")
                                        : t("promotion.form.uploadImage")
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer inline-flex items-center justify-center w-6 h-6 text-white/60 hover:text-[#e5c12f] transition-colors"
                                  >
                                    <Upload
                                      size={13}
                                      className={isUp ? "animate-pulse" : ""}
                                    />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      hidden
                                      onChange={(e) =>
                                        e.target.files?.[0] &&
                                        handleCityFile(
                                          country.id,
                                          h.id,
                                          e.target.files[0],
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                                {cur?.imagem && (
                                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                    <img
                                      src={cur.imagem}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-white/40 text-xs sm:col-span-2">
                        {t("promotion.form.noCities")}
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
        <div>
          <ModalPreview p={state} />
        </div>
      </div>
    </form>
  );
}
