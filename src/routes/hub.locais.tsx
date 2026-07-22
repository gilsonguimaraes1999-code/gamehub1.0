import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2, Globe2, MapPin, Save, GripVertical } from "lucide-react";
import { fetchBootstrap, salvarInterface, slugify, type Local } from "@/lib/sghub-api";
import { useAuthSession } from "@/lib/auth-store";
import { hasPermission } from "@/lib/permissions";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/hub/locais")({
  ssr: false,
  component: LocaisPage,
});

const fieldCls = "w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 outline-none focus:border-[#d4af37]/50 text-sm";

type Cidade = { id: string; nome: string };

// Composite IDs so we can distinguish país vs cidade drags.
const paisDndId = (id: string) => `pais:${id}`;
const cidadeDndId = (paisId: string, cidadeId: string) => `cidade:${paisId}:${cidadeId}`;
const parseId = (id: string) => {
  const [kind, ...rest] = id.split(":");
  return { kind: kind as "pais" | "cidade", parts: rest };
};

function LocaisPage() {
  const qc = useQueryClient();
  const { session } = useAuthSession();
  const { data, isLoading } = useQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000 });

  const [locais, setLocais] = useState<Local[]>([]);
  const [dirty, setDirty] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (data?.locais) setLocais(structuredClone(data.locais));
  }, [data?.locais]);

  const saveMut = useMutation({
    mutationFn: async (next: Local[]) => {
      const iface = data?.interface || {};
      await salvarInterface({ ...iface, locais: next }, session?.nome || "OWNER");
    },
    onSuccess: async () => {
      toast.success("Locais sincronizados!");
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
    onError: (e) => toast.error((e as Error).message || "Falha ao salvar."),
  });

  const [novoPais, setNovoPais] = useState("");
  const canView = hasPermission(session, "locais.ver");
  const canEdit = hasPermission(session, "locais.editar");

  const addPais = () => {
    const nome = novoPais.trim();
    if (!nome) return;
    let id = slugify(nome);
    while (locais.some((l) => l.id === id)) id = `${id}_${Math.floor(Math.random() * 90 + 10)}`;
    setLocais([...locais, { id, nome, cidades: [] }]);
    setNovoPais("");
    setDirty(true);
  };

  const removePais = (id: string) => {
    if (!confirm("Remover este país e todas as cidades dele?")) return;
    setLocais(locais.filter((l) => l.id !== id));
    setDirty(true);
  };

  const renamePais = (id: string, nome: string) => {
    setLocais(locais.map((l) => l.id === id ? { ...l, nome } : l));
    setDirty(true);
  };

  const addCidade = (paisId: string, nome: string) => {
    if (!nome.trim()) return;
    setLocais(locais.map((l) => {
      if (l.id !== paisId) return l;
      let id = slugify(nome);
      while ((l.cidades || []).some((c) => c.id === id)) id = `${id}_${Math.floor(Math.random() * 90 + 10)}`;
      return { ...l, cidades: [...(l.cidades || []), { id, nome: nome.trim() }] };
    }));
    setDirty(true);
  };

  const removeCidade = (paisId: string, cidadeId: string) => {
    setLocais(locais.map((l) =>
      l.id === paisId ? { ...l, cidades: (l.cidades || []).filter((c) => c.id !== cidadeId) } : l
    ));
    setDirty(true);
  };

  const renameCidade = (paisId: string, cidadeId: string, nome: string) => {
    setLocais(locais.map((l) =>
      l.id === paisId
        ? { ...l, cidades: (l.cidades || []).map((c) => c.id === cidadeId ? { ...c, nome } : c) }
        : l
    ));
    setDirty(true);
  };

  // ---- dnd-kit sensors ----
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const findCidadeContainer = (cidadeId: string): string | null => {
    for (const p of locais) {
      if ((p.cidades || []).some((c) => c.id === cidadeId)) return p.id;
    }
    return null;
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const a = parseId(String(active.id));
    const o = parseId(String(over.id));
    if (a.kind !== "cidade") return;

    const [fromPais, cidadeId] = a.parts;
    // Determine destination country
    let toPais: string | null = null;
    let overCidadeId: string | null = null;
    if (o.kind === "cidade") {
      toPais = o.parts[0];
      overCidadeId = o.parts[1];
    } else if (o.kind === "pais") {
      toPais = o.parts[0];
    }
    if (!toPais || toPais === fromPais) return;

    setLocais((prev) => {
      const next = prev.map((l) => ({ ...l, cidades: [...(l.cidades || [])] }));
      const src = next.find((l) => l.id === fromPais);
      const dst = next.find((l) => l.id === toPais);
      if (!src || !dst) return prev;
      const idx = src.cidades.findIndex((c) => c.id === cidadeId);
      if (idx < 0) return prev;
      const [item] = src.cidades.splice(idx, 1);
      // avoid id collision
      let newId = item.id;
      while (dst.cidades.some((c) => c.id === newId)) newId = `${newId}_${Math.floor(Math.random() * 90 + 10)}`;
      item.id = newId;
      const ti = overCidadeId ? dst.cidades.findIndex((c) => c.id === overCidadeId) : -1;
      dst.cidades.splice(ti < 0 ? dst.cidades.length : ti, 0, item);
      return next;
    });
    setDirty(true);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const a = parseId(String(active.id));
    const o = parseId(String(over.id));

    if (a.kind === "pais" && o.kind === "pais") {
      setLocais((prev) => {
        const from = prev.findIndex((l) => l.id === a.parts[0]);
        const to = prev.findIndex((l) => l.id === o.parts[0]);
        if (from < 0 || to < 0) return prev;
        return arrayMove(prev, from, to);
      });
      setDirty(true);
      return;
    }

    if (a.kind === "cidade") {
      const cidadeId = a.parts[1];
      const paisId = findCidadeContainer(cidadeId);
      if (!paisId) return;
      if (o.kind === "cidade" && o.parts[0] === paisId) {
        setLocais((prev) => {
          const next = prev.map((l) => ({ ...l }));
          const p = next.find((l) => l.id === paisId);
          if (!p) return prev;
          const list = [...(p.cidades || [])];
          const from = list.findIndex((c) => c.id === cidadeId);
          const to = list.findIndex((c) => c.id === o.parts[1]);
          if (from < 0 || to < 0) return prev;
          p.cidades = arrayMove(list, from, to);
          return next;
        });
        setDirty(true);
      }
    }
  };

  const activeParsed = activeId ? parseId(activeId) : null;
  const activePais = activeParsed?.kind === "pais" ? locais.find((l) => l.id === activeParsed.parts[0]) : null;
  const activeCidade: Cidade | null = useMemo(() => {
    if (activeParsed?.kind !== "cidade") return null;
    const [, cid] = activeParsed.parts;
    for (const p of locais) {
      const c = (p.cidades || []).find((x) => x.id === cid);
      if (c) return c;
    }
    return null;
  }, [activeParsed, locais]);

  return (
    <div className="px-6 lg:px-12 py-10 pt-20 lg:pt-14 max-w-4xl mx-auto">
      <Link to="/hub" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-6">
        <ChevronLeft size={14} /> Voltar
      </Link>
      <header className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="manual-comercial-gold text-4xl sm:text-5xl font-display font-black tracking-tight leading-tight pb-2">
            Gerenciar Locais
          </h1>
          <p className="text-white/50 text-sm mt-3 max-w-xl">
            Arraste a barrinha para reordenar países ou mover cidades entre eles.
          </p>
        </div>
        {canEdit && <button
          onClick={() => saveMut.mutate(locais)}
          disabled={!dirty || saveMut.isPending}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black font-black uppercase tracking-widest text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={14} /> {saveMut.isPending ? "Sincronizando..." : dirty ? "Sincronizar" : "Salvo"}
        </button>}
      </header>

      {!canView && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center text-red-200">
          Você não tem permissão para visualizar locais.
        </div>
      )}

      {canView && canEdit && <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-6 flex items-center gap-3">
        <Globe2 size={18} className="text-[#d4af37]" />
        <input
          value={novoPais}
          onChange={(e) => setNovoPais(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPais()}
          placeholder="Novo país (ex.: França, Brasil, Portugal, Espanha...)"
          className={fieldCls + " flex-1"}
        />
        <button onClick={addPais} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/10 text-xs font-black uppercase tracking-widest">
          <Plus size={14} /> Adicionar país
        </button>
      </section>}

      {canView && isLoading && <p className="text-white/40 text-sm uppercase tracking-widest">Carregando...</p>}

      {canView && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={locais.map((l) => paisDndId(l.id))} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {locais.map((pais) => (
                <SortablePais
                  key={pais.id}
                  pais={pais}
                  canEdit={canEdit}
                  onRename={(nome) => renamePais(pais.id, nome)}
                  onRemove={() => removePais(pais.id)}
                  onAddCidade={(nome) => addCidade(pais.id, nome)}
                  onRemoveCidade={(cid) => removeCidade(pais.id, cid)}
                  onRenameCidade={(cid, nome) => renameCidade(pais.id, cid, nome)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activePais && (
              <div className="rounded-2xl border border-[#d4af37]/60 bg-[#1a1200]/90 backdrop-blur px-5 py-4 shadow-2xl shadow-black/60">
                <div className="flex items-center gap-3">
                  <GripVertical size={18} className="text-[#d4af37]" />
                  <span className="w-1.5 h-8 rounded-full bg-[#d4af37]" />
                  <span className="text-white font-black text-lg uppercase tracking-widest">{activePais.nome}</span>
                </div>
              </div>
            )}
            {activeCidade && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/60 bg-[#1a1200]/90 backdrop-blur px-3 py-2 shadow-2xl shadow-black/60">
                <GripVertical size={14} className="text-[#d4af37]" />
                <MapPin size={14} className="text-[#d4af37]" />
                <span className="text-white text-sm">{activeCidade.nome}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function SortablePais({
  pais, canEdit, onRename, onRemove, onAddCidade, onRemoveCidade, onRenameCidade,
}: {
  pais: Local;
  canEdit: boolean;
  onRename: (n: string) => void;
  onRemove: () => void;
  onAddCidade: (n: string) => void;
  onRemoveCidade: (cid: string) => void;
  onRenameCidade: (cid: string, nome: string) => void;
}) {
  const [nova, setNova] = useState("");
  const sortable = useSortable({ id: paisDndId(pais.id), data: { type: "pais" } });
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = sortable;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
    >
      <div className="flex items-center gap-3 mb-4">
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            aria-label="Arrastar país"
            className="cursor-grab active:cursor-grabbing p-1.5 rounded text-white/40 hover:text-[#d4af37] hover:bg-[#d4af37]/10 touch-none"
            title="Arraste para reordenar"
          >
            <GripVertical size={18} />
          </button>
        )}
        <span className="w-1.5 h-8 rounded-full bg-[#d4af37]" />
        <input
          value={pais.nome}
          onChange={(e) => onRename(e.target.value)}
          readOnly={!canEdit}
          className="flex-1 bg-transparent border-none outline-none text-white font-black text-lg uppercase tracking-widest focus:text-[#d4af37]"
        />
        {canEdit && (
          <button onClick={onRemove} className="p-2 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-300" aria-label="Remover país">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <SortableContext
        items={(pais.cidades || []).map((c) => cidadeDndId(pais.id, c.id))}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 min-h-[3rem]">
          {(pais.cidades || []).map((c) => (
            <SortableCidade
              key={c.id}
              paisId={pais.id}
              cidade={c}
              canEdit={canEdit}
              onRename={(nome) => onRenameCidade(c.id, nome)}
              onRemove={() => onRemoveCidade(c.id)}
            />
          ))}
          {(!pais.cidades || pais.cidades.length === 0) && (
            <p className="text-white/30 text-xs italic md:col-span-2">
              Sem cidades ainda. Arraste uma cidade aqui para movê-la.
            </p>
          )}
        </div>
      </SortableContext>

      {canEdit && <div className="flex items-center gap-2">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddCidade(nova);
              setNova("");
            }
          }}
          placeholder="Nova cidade"
          className={fieldCls + " flex-1"}
        />
        <button
          onClick={() => { onAddCidade(nova); setNova(""); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:border-[#d4af37]/40 hover:text-[#d4af37] text-xs font-black uppercase tracking-widest"
        >
          <Plus size={12} /> Cidade
        </button>
      </div>}
    </div>
  );
}

function SortableCidade({
  paisId, cidade, canEdit, onRename, onRemove,
}: {
  paisId: string;
  cidade: Cidade;
  canEdit: boolean;
  onRename: (n: string) => void;
  onRemove: () => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: cidadeDndId(paisId, cidade.id),
    data: { type: "cidade", paisId },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastar cidade"
          className="cursor-grab active:cursor-grabbing p-0.5 rounded text-white/30 hover:text-[#d4af37] touch-none"
          title="Arraste para reordenar ou mover"
        >
          <GripVertical size={14} />
        </button>
      )}
      <MapPin size={14} className="text-[#d4af37] shrink-0" />
      <input
        value={cidade.nome}
        onChange={(e) => onRename(e.target.value)}
        readOnly={!canEdit}
        className="flex-1 bg-transparent border-none outline-none text-white text-sm focus:text-[#d4af37] min-w-0"
      />
      {canEdit && (
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-300" aria-label="Remover cidade">
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}
