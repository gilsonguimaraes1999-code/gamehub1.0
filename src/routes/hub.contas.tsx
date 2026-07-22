import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2, Pencil, Save, X, Eye } from "lucide-react";
import { atualizarConta, criarConta, deletarConta, fetchBootstrap, type Conta } from "@/lib/sghub-api";
import { getOriginalSession, startImpersonation, useAuthSession } from "@/lib/auth-store";
import { hasPermission, normalizeCargo, permissoesPadrao, type PermissoesPorCargo } from "@/lib/permissions";


export const Route = createFileRoute("/hub/contas")({
  ssr: false,
  component: ContasPage,
});

const CARGOS = ["OWNER", "ADMIN", "COMERCIAL", "VISITANTE"];
const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const fieldCls = "w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 outline-none focus:border-[#d4af37]/50 focus:ring-2 focus:ring-[#e5c12f] text-sm appearance-none";
const labelCls = "block text-[10px] font-black uppercase tracking-widest text-[#a8a8a8] mb-1.5";

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function ContasPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { session, impersonating } = useAuthSession();
  const { data, isLoading } = useQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000 });
  const contas = data?.contas ?? [];

  const canView = hasPermission(session, "contas.ver");
  const canCreate = hasPermission(session, "contas.criar");
  const canEdit = hasPermission(session, "contas.editar");
  const canDelete = hasPermission(session, "contas.excluir");
  // Só OWNER real pode impersonar. Se já estiver impersonando, checa o original.
  const effectiveCargo = impersonating
    ? normalizeCargo(getOriginalSession()?.tipo)
    : normalizeCargo(session?.tipo);
  const canImpersonate = effectiveCargo === "OWNER";

  const permissoesPorCargo = useMemo<PermissoesPorCargo>(() => {
    const stored = data?.configuracao?.permissoes as PermissoesPorCargo | undefined;
    return { ...permissoesPadrao(), ...(stored || {}) };
  }, [data?.configuracao]);


  const invalidate = () => qc.invalidateQueries({ queryKey: ["bootstrap"] });

  const createMut = useMutation({
    mutationFn: criarConta,
    onSuccess: async () => { toast.success("Conta criada."); await invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: string; input: Partial<Conta> & { senha?: string } }) => atualizarConta(v.id, v.input),
    onSuccess: async () => { toast.success("Conta atualizada."); await invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const deleteMut = useMutation({
    mutationFn: deletarConta,
    onSuccess: async () => { toast.success("Conta removida."); await invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const [novo, setNovo] = useState({ usuario: "", senha: "", nome: "", cargo: "COMERCIAL" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!novo.usuario.trim() || !novo.senha.trim()) return toast.error("Usuário e senha obrigatórios.");
    createMut.mutate({ ...novo, status: "ativo", permissoes: permissoesPorCargo[normalizeCargo(novo.cargo)] || [] }, {
      onSuccess: () => setNovo({ usuario: "", senha: "", nome: "", cargo: "COMERCIAL" }),
    });
  };

  return (
    <div className="px-6 lg:px-12 py-10 pt-20 lg:pt-14 max-w-5xl mx-auto">
      <Link to="/hub" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-6">
        <ChevronLeft size={14} /> Voltar
      </Link>
      <header className="mb-10">
        <h1 className="manual-comercial-gold text-4xl sm:text-5xl font-display font-black tracking-tight leading-tight pb-2">
          Contas de Acesso
        </h1>
      </header>

      {!canView && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center text-red-200">
          Você não tem permissão para visualizar contas.
        </div>
      )}

      {/* Nova conta */}
      {canView && canCreate && <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-8">
        <h3 className="font-black uppercase tracking-widest text-xs text-[#d4af37] mb-4">+ Nova conta</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <LabeledField label="Usuário">
            <input placeholder="ex.: joao" value={novo.usuario} onChange={(e) => setNovo({ ...novo, usuario: e.target.value })} className={fieldCls} />
          </LabeledField>
          <LabeledField label="Senha">
            <input type="password" placeholder="••••••" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} className={fieldCls} />
          </LabeledField>
          <LabeledField label="Nome">
            <input placeholder="Nome completo" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className={fieldCls} />
          </LabeledField>
          <LabeledField label="Cargo">
            <select value={novo.cargo} onChange={(e) => setNovo({ ...novo, cargo: e.target.value })} className={fieldCls}>
              {CARGOS.map((c) => <option key={c} value={c} className="bg-black text-white">{titleCase(c)}</option>)}
            </select>
          </LabeledField>
          <div className="flex items-end">
            <button onClick={handleCreate} disabled={createMut.isPending} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black font-black uppercase tracking-widest text-xs disabled:opacity-50">
              <Plus size={14} /> Criar
            </button>
          </div>
        </div>
      </section>}

      {canView && isLoading && <p className="text-white/40 text-sm uppercase tracking-widest">Carregando...</p>}

      {canView && <div className="space-y-3">
        {contas.map((c) => (
          <ContaRow
            key={c.id}
            conta={c}
            editing={editingId === c.id}
            onToggleEdit={() => setEditingId((prev) => (prev === c.id ? null : c.id))}
            canEdit={canEdit}
            canDelete={canDelete}
            canImpersonate={canImpersonate && c.id !== session?.accountId && c.usuario !== session?.accountId}
            onImpersonate={() => {
              const cargo = normalizeCargo(c.cargo);
              const permissoes = permissoesPorCargo[cargo] || [];
              startImpersonation({
                accountId: c.id || c.usuario,
                nome: c.nome || c.usuario,
                tipo: c.cargo,
                permissoes,
              });
              toast.success(`Visualizando como ${c.nome || c.usuario}.`);
              navigate({ to: "/hub", replace: true });
            }}
            onSave={async (input) => {
              const cargo = normalizeCargo(input.cargo || c.cargo);
              await updateMut.mutateAsync({ id: c.id, input: { ...input, permissoes: permissoesPorCargo[cargo] || [] } });
              setEditingId(null);
            }}
            onDelete={() => { if (confirm(`Excluir a conta "${c.usuario}"?`)) deleteMut.mutate(c.id); }}
            saving={updateMut.isPending}
          />
        ))}

        {!isLoading && contas.length === 0 && (
          <p className="text-center text-white/40 py-10">Nenhuma conta cadastrada.</p>
        )}
      </div>}
    </div>
  );
}


function ContaRow({ conta, editing, canEdit, canDelete, canImpersonate, onImpersonate, onToggleEdit, onSave, onDelete, saving }: { conta: Conta; editing: boolean; canEdit: boolean; canDelete: boolean; canImpersonate: boolean; onImpersonate: () => void; onToggleEdit: () => void; onSave: (i: Partial<Conta> & { senha?: string }) => Promise<unknown>; onDelete: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    usuario: conta.usuario || "",
    nome: conta.nome || "",
    cargo: conta.cargo || "COMERCIAL",
    status: conta.status || "ativo",
    senha: "",
  });

  // Reset form when entering edit mode or when conta changes
  const resetForm = () => setForm({
    usuario: conta.usuario || "",
    nome: conta.nome || "",
    cargo: conta.cargo || "COMERCIAL",
    status: conta.status || "ativo",
    senha: "",
  });

  const handleSave = async () => {
    const payload: Partial<Conta> & { senha?: string } = {
      usuario: form.usuario,
      nome: form.nome,
      cargo: form.cargo,
      status: form.status,
    };
    if (form.senha.trim()) payload.senha = form.senha;
    await onSave(payload);
    setForm({ ...form, senha: "" });
  };

  return (
    <div className={`rounded-xl border ${editing ? "border-[#d4af37]/50" : "border-white/10"} bg-white/[0.02] overflow-hidden transition-colors`}>
      <div className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center font-black text-[#d4af37] uppercase shrink-0">
          {(conta.nome || conta.usuario || "?")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-white truncate">{conta.nome || conta.usuario}</div>
          <div className="text-xs text-white/50 font-mono truncate">@{conta.usuario}</div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#f9e29f]">{titleCase(conta.cargo || "—")}</span>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${(conta.status || "").toLowerCase() === "ativo" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/15 text-white/40"}`}>
          {titleCase(conta.status || "inativo")}
        </span>
        {canImpersonate && (
          <button
            onClick={onImpersonate}
            className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-[#d4af37]"
            aria-label="Visualizar como esta conta"
            title="Visualizar como esta conta"
          >
            <Eye size={16} />
          </button>
        )}
        {canEdit && (
          <button
            onClick={() => { if (!editing) resetForm(); onToggleEdit(); }}
            className={`p-2 rounded-lg hover:bg-white/5 ${editing ? "text-[#d4af37] bg-white/5" : "text-white/60 hover:text-[#d4af37]"}`}
            aria-label="Editar"
          >
            <Pencil size={16} />
          </button>
        )}

        {canDelete && (
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-300" aria-label="Excluir">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {editing && (
        <div className="border-t border-white/10 p-4 space-y-3 bg-black/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledField label="Usuário">
              <input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} placeholder="ex.: joao" className={fieldCls} />
            </LabeledField>
            <LabeledField label="Nome">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className={fieldCls} />
            </LabeledField>
            <LabeledField label="Cargo">
              <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className={fieldCls}>
                {CARGOS.map((c) => <option key={c} value={c} className="bg-black text-white">{titleCase(c)}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={fieldCls}>
                <option value="ativo" className="bg-black text-white">Ativo</option>
                <option value="inativo" className="bg-black text-white">Inativo</option>
              </select>
            </LabeledField>
            <div className="md:col-span-2">
              <LabeledField label="Senha">
                <input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Nova senha (deixe em branco para manter)" className={fieldCls} />
              </LabeledField>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onToggleEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 text-xs font-black uppercase tracking-widest">
              <X size={14} /> Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black font-black uppercase tracking-widest text-xs disabled:opacity-50">
              <Save size={14} /> Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
