import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import PromocaoForm from "@/components/sghub/PromocaoForm";
import { atualizarPromocao, deletarPromocao, fetchBootstrap } from "@/lib/sghub-api";
import { useAuthSession } from "@/lib/auth-store";
import { hasPermission } from "@/lib/permissions";

export const Route = createFileRoute("/hub/promocoes/$id")({
  ssr: false,
  component: EditarPromocao,
});

function EditarPromocao() {
  const { id } = useParams({ from: "/hub/promocoes/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuthSession();
  const { data, isLoading } = useQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000 });
  const canEdit = hasPermission(session, "promocoes.editar");
  const canDelete = hasPermission(session, "promocoes.excluir");

  const promocao = data?.promocoes.find((p) => p.id === id);

  const updateMut = useMutation({
    mutationFn: (payload: Parameters<typeof atualizarPromocao>[1]) => atualizarPromocao(id, payload),
    onSuccess: async () => {
      toast.success("Promoção atualizada!");
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      navigate({ to: "/hub" });
    },
    onError: (e) => toast.error((e as Error).message || "Erro ao salvar."),
  });

  const deleteMut = useMutation({
    mutationFn: () => deletarPromocao(id),
    onSuccess: async () => {
      toast.success("Promoção removida.");
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      navigate({ to: "/hub" });
    },
    onError: (e) => toast.error((e as Error).message || "Erro ao excluir."),
  });

  return (
    <div className="px-6 lg:px-12 py-10 pt-20 lg:pt-14 max-w-7xl mx-auto">
      <Link to="/hub" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-6">
        <ChevronLeft size={14} /> Voltar
      </Link>

      <header className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="manual-comercial-gold text-4xl sm:text-5xl font-display font-black tracking-tight leading-tight pb-2 break-words">
            {promocao?.nome_interno || promocao?.nome || "Promoção"}
          </h1>
        </div>
        {promocao && canDelete && (
          <button
            onClick={() => {
              if (confirm("Excluir esta promoção definitivamente?")) deleteMut.mutate();
            }}
            disabled={deleteMut.isPending}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            <Trash2 size={14} /> Excluir
          </button>
        )}
      </header>

      {isLoading && <p className="text-white/40 text-sm uppercase tracking-widest">Carregando...</p>}
      {!isLoading && !promocao && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/50">
          Promoção não encontrada.
        </div>
      )}
      {promocao && !canEdit && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center text-red-200">
          Você não tem permissão para editar promoções.
        </div>
      )}
      {promocao && canEdit && (
        <PromocaoForm
          initial={promocao}
          locais={data?.locais ?? []}
          submitting={updateMut.isPending}
          onSubmit={async (p) => { await updateMut.mutateAsync(p); }}
          onCancel={() => navigate({ to: "/hub" })}
          submitLabel="Salvar alterações"
        />
      )}
    </div>
  );
}
