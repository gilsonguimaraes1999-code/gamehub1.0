import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import PromocaoForm from "@/components/sghub/PromocaoForm";
import { criarPromocao, fetchBootstrap } from "@/lib/sghub-api";
import { useAuthSession } from "@/lib/auth-store";
import { hasPermission } from "@/lib/permissions";

export const Route = createFileRoute("/hub/promocoes/nova")({
  ssr: false,
  component: NovaPromocao,
});

function NovaPromocao() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuthSession();
  const { data, isLoading } = useQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000 });
  const canCreate = hasPermission(session, "promocoes.criar");

  const mutation = useMutation({
    mutationFn: criarPromocao,
    onSuccess: async () => {
      toast.success("Promoção criada!");
      await qc.invalidateQueries({ queryKey: ["bootstrap"] });
      navigate({ to: "/hub" });
    },
    onError: (e) => toast.error((e as Error).message || "Erro ao criar."),
  });

  return (
    <div className="px-6 lg:px-12 py-10 pt-20 lg:pt-14 max-w-7xl mx-auto">
      <Link to="/hub" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white/50 hover:text-[#d4af37] mb-6">
        <ChevronLeft size={14} /> Voltar
      </Link>
      <header className="mb-10">
        <h1 className="manual-comercial-gold text-4xl sm:text-5xl font-display font-black tracking-tight leading-tight pb-2">
          Criar Promoção
        </h1>
      </header>
      {!canCreate ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center text-red-200">
          Você não tem permissão para criar promoções.
        </div>
      ) : isLoading ? (
        <p className="text-white/40 text-sm uppercase tracking-widest">Carregando locais...</p>
      ) : (
        <PromocaoForm
          locais={data?.locais ?? []}
          submitting={mutation.isPending}
          onSubmit={async (p) => { await mutation.mutateAsync(p); }}
          onCancel={() => navigate({ to: "/hub" })}
          submitLabel="Criar promoção"
        />
      )}
    </div>
  );
}
