import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Save, Upload, Trash2 } from "lucide-react";
import { fetchBootstrap, salvarInterface, uploadImage } from "@/lib/sghub-api";
import { useAuthSession } from "@/lib/auth-store";
import { hasPermission } from "@/lib/permissions";

export const Route = createFileRoute("/hub/configuracoes")({
  ssr: false,
  component: ConfiguracoesPage,
});

const fieldCls = "w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#d4af37]/50 text-sm";
const labelCls = "block text-[11px] font-black uppercase tracking-widest text-white/50 mb-2";

const CAMPOS: { key: string; label: string; type?: "text" | "textarea" }[] = [
  { key: "logoTexto", label: "Logo — Texto principal" },
  { key: "logoSubtexto", label: "Logo — Subtexto" },
  { key: "loginTitulo", label: "Login — Título" },
  { key: "loginSubtitulo", label: "Login — Subtítulo" },
  { key: "rodapeLogin", label: "Login — Rodapé" },
  { key: "sidebarTitle", label: "Sidebar — Título" },
  { key: "sidebarSubtitle", label: "Sidebar — Subtítulo" },
  { key: "dashboardTitle", label: "Painel — Título" },
  { key: "dashboardSubtitle", label: "Painel — Subtítulo", type: "textarea" },
  { key: "botaoNovaPromocao", label: "Botão de nova promoção" },
  { key: "placeholderPesquisa", label: "Placeholder da pesquisa" },
];

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const { session } = useAuthSession();
  const { data, isLoading } = useQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000 });

  const [form, setForm] = useState<Record<string, unknown>>({});
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const canView = hasPermission(session, "configuracoes.ver");
  const canEdit = hasPermission(session, "configuracoes.editar");

  useEffect(() => {
    if (data?.interface) {
      setForm({ ...data.interface });
      const li = data.interface.logoImagem as { url?: string } | string | undefined;
      setLogoUrl(typeof li === "string" ? li : li?.url || "");
    }
  }, [data?.interface]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        logoImagem: logoUrl ? { url: logoUrl } : {},
        locais: data?.locais || [],
      };
      await salvarInterface(payload, session?.nome || "OWNER");
    },
    onSuccess: async () => { toast.success("Interface salva!"); await qc.invalidateQueries({ queryKey: ["bootstrap"] }); },
    onError: (e) => toast.error((e as Error).message || "Erro ao salvar."),
  });

  const handleLogo = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
      const url = await uploadImage(dataUrl);
      setLogoUrl(url);
      toast.success("Logo enviada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-6 lg:px-12 py-10 pt-20 lg:pt-14 max-w-3xl mx-auto">
      <Link to="/hub" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-6">
        <ChevronLeft size={14} /> Voltar
      </Link>
      <header className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="manual-comercial-gold text-4xl sm:text-5xl font-display font-black tracking-tight leading-tight pb-2">
            Configurações
          </h1>
        </div>
        {canEdit && <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black font-black uppercase tracking-widest text-xs disabled:opacity-50"
        >
          <Save size={14} /> {saveMut.isPending ? "Salvando..." : "Salvar"}
        </button>}
      </header>

      {!canView ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center text-red-200">
          Você não tem permissão para visualizar configurações.
        </div>
      ) : isLoading ? (
        <p className="text-white/40 text-sm uppercase tracking-widest">Carregando...</p>
      ) : (
        <div className="space-y-8">
          {/* Logo */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <label className={labelCls}>Logo (imagem)</label>
            <div className="flex flex-wrap items-center gap-4">
              {logoUrl && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-black">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  <button type="button" onClick={() => setLogoUrl("")} className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-red-400 hover:bg-red-500 hover:text-white">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
              {canEdit && <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/20 text-white/70 hover:border-[#d4af37]/50 hover:text-white text-sm">
                <Upload size={16} /> {uploading ? "Enviando..." : logoUrl ? "Trocar" : "Escolher"}
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])} />
              </label>}
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} readOnly={!canEdit} placeholder="URL da imagem" className={fieldCls + " flex-1 min-w-64"} />
            </div>
          </section>

          {/* Campos de texto */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CAMPOS.map((c) => (
              <div key={c.key} className={c.type === "textarea" ? "md:col-span-2" : ""}>
                <label className={labelCls}>{c.label}</label>
                {c.type === "textarea" ? (
                  <textarea
                    value={String(form[c.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    readOnly={!canEdit}
                    rows={3}
                    className={fieldCls + " min-h-24"}
                  />
                ) : (
                  <input
                    value={String(form[c.key] ?? "")}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    readOnly={!canEdit}
                    className={fieldCls}
                  />
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
