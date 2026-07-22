import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Save, ShieldCheck, Lock } from "lucide-react";
import { fetchBootstrap, salvarInterface } from "@/lib/sghub-api";
import { useAuthSession } from "@/lib/auth-store";
import { PERMISSOES_GRUPOS, PERMISSOES_VISITANTE, TODAS_PERMISSOES, permissoesPadrao, type PermissoesPorCargo } from "@/lib/permissions";

export const Route = createFileRoute("/hub/permissoes")({
  ssr: false,
  component: PermissoesPage,
});

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

const CARGOS_EDITAVEIS = ["ADMIN", "COMERCIAL"] as const;

function PermissoesPage() {
  const { session, hydrated } = useAuthSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000 });

  const isOwner = (session?.tipo || "").toUpperCase() === "OWNER";

  useEffect(() => {
    if (hydrated && session && !isOwner) navigate({ to: "/hub", replace: true });
  }, [hydrated, session, isOwner, navigate]);

  const stored = useMemo<PermissoesPorCargo | undefined>(() => {
    const cfg = data?.configuracao as Record<string, unknown> | undefined;
    const iface = data?.interface as Record<string, unknown> | undefined;
    return (cfg?.permissoes as PermissoesPorCargo | undefined)
      || (iface?.permissoes as PermissoesPorCargo | undefined)
      || undefined;
  }, [data]);

  const inicial = useMemo<PermissoesPorCargo>(() => {
    const base = permissoesPadrao();
    if (!stored) return base;
    return { ...base, ...stored, OWNER: [...TODAS_PERMISSOES], VISITANTE: [...PERMISSOES_VISITANTE] };
  }, [stored]);

  const [state, setState] = useState<PermissoesPorCargo>(inicial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setState(inicial); setDirty(false); }, [inicial]);

  const saveMut = useMutation({
    mutationFn: async (novo: PermissoesPorCargo) => {
      // Salva na aba "Configuracao" (chave: permissoes) e registra em Log_Configuracao
      await salvarInterface({ configuracao: { permissoes: novo } }, session?.nome || "OWNER");
    },
    onSuccess: async () => {
      toast.success("Permissões salvas.");
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggle = (cargo: string, permKey: string) => {
    setState((prev) => {
      const atual = new Set(prev[cargo] || []);
      if (atual.has(permKey)) atual.delete(permKey); else atual.add(permKey);
      return { ...prev, [cargo]: Array.from(atual) };
    });
    setDirty(true);
  };

  if (!hydrated || !session) return null;
  if (!isOwner) return null;

  return (
    <div className="px-6 lg:px-12 py-10 pt-20 lg:pt-14 max-w-5xl mx-auto">
      <Link to="/hub" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-6">
        <ChevronLeft size={14} /> Voltar
      </Link>

      <header className="mb-8 flex items-start gap-4">
        <ShieldCheck className="text-[#d4af37] mt-1" size={30} />
        <div>
          <h1 className="manual-comercial-gold text-4xl sm:text-5xl font-display font-black tracking-tight leading-tight pb-2">
            Permissões
          </h1>
          <p className="text-sm text-white/50 max-w-xl">
            Defina o que cada cargo pode fazer. Somente o Owner acessa e edita esta página.
            As alterações são gravadas na aba <b className="text-[#f9e29f]">Configuracao</b> e registradas em <b className="text-[#f9e29f]">Log_Configuracao</b>.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-black/30 space-y-2">
          <div className="flex items-start gap-2 text-xs text-white/60">
            <Lock size={12} className="mt-0.5 text-[#d4af37]" />
            <span><b className="text-[#f9e29f]">Owner</b> — acesso total a tudo (não editável).</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-white/60">
            <Lock size={12} className="mt-0.5 text-[#d4af37]" />
            <span><b className="text-[#f9e29f]">Visitante</b> — somente visualização, sem permissões adicionais.</span>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {CARGOS_EDITAVEIS.map((cargo) => (
            <div key={cargo} className="p-5">
              <h3 className="font-black uppercase tracking-widest text-sm text-[#d4af37] mb-4">{titleCase(cargo)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {PERMISSOES_GRUPOS.map((g) => (
                  <div key={g.key}>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">{g.titulo}</div>
                    <div className="space-y-1.5">
                      {g.itens.map((item) => {
                        const checked = (state[cargo] || []).includes(item.key);
                        return (
                          <label key={item.key} className="flex items-start gap-2.5 cursor-pointer group">
                            <span className="relative mt-1 shrink-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(cargo, item.key)}
                                className="peer appearance-none w-4 h-4 rounded-full border border-[#d4af37]/60 bg-transparent cursor-pointer checked:bg-[#d4af37] checked:border-[#d4af37] hover:border-[#d4af37] transition-colors"
                              />
                            </span>
                            <span className="flex-1">
                              <span className="text-sm text-white font-semibold group-hover:text-[#f9e29f]">{item.label}</span>
                              <span className="block text-[11px] text-white/45 leading-snug">{item.descricao}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-between">
          <span className="text-xs text-white/40">
            {dirty ? "Alterações não salvas." : "Sincronizado com a planilha."}
          </span>
          <button
            onClick={() => saveMut.mutate(state)}
            disabled={!dirty || saveMut.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black font-black uppercase tracking-widest text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={14} /> Salvar permissões
          </button>
        </div>
      </div>
    </div>
  );
}
