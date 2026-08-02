import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Eye, LogOut } from "lucide-react";
import HubSidebar from "@/components/sghub/HubSidebar";
import UpdateAppliedModal from "@/components/sghub/UpdateAppliedModal";
import { setStoredSession, stopImpersonation, getOriginalSession, useAuthSession } from "@/lib/auth-store";
import { fetchBootstrap } from "@/lib/sghub-api";
import { normalizeCargo, permissoesPadrao, TODAS_PERMISSOES, PERMISSOES_VISITANTE, type PermissoesPorCargo } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import LanguageSelector from "@/components/sghub/LanguageSelector";


export const Route = createFileRoute("/hub")({
  ssr: false,
  component: HubLayout,
});

function HubLayout() {
  const { t } = useI18n();
  const { session, hydrated, impersonating } = useAuthSession();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000, enabled: !!session });

  useEffect(() => {
    if (hydrated && !session) {
      navigate({ to: "/login", replace: true });
    }
  }, [hydrated, session, navigate]);

  useEffect(() => {
    if (!session || !data) return;
    const account = data.contas?.find((c) => c.id === session.accountId || c.usuario === session.accountId || c.nome === session.nome);
    const stored = data.configuracao?.permissoes as PermissoesPorCargo | undefined;
    // Owner e Visitante são fixos e não editáveis
    const porCargo: PermissoesPorCargo = {
      ...permissoesPadrao(),
      ...(stored || {}),
      OWNER: [...TODAS_PERMISSOES],
      VISITANTE: [...PERMISSOES_VISITANTE],
    };
    const cargo = normalizeCargo(account?.cargo || session.tipo);
    const permissoes = porCargo[cargo] || [];
    const samePerms = JSON.stringify(session.permissoes || []) === JSON.stringify(permissoes);
    const sameCargo = (session.tipo || "") === (account?.cargo || session.tipo || "");
    const sameNome = (session.nome || "") === (account?.nome || session.nome || "");
    if (samePerms && sameCargo && sameNome) return;
    setStoredSession({
      ...session,
      nome: account?.nome || session.nome,
      tipo: account?.cargo || session.tipo,
      permissoes,
    });
  }, [data, session]);

  if (!hydrated || !session) return null;

  const original = impersonating ? getOriginalSession() : null;

  const handleStopImpersonation = () => {
    stopImpersonation();
    navigate({ to: "/hub/contas", replace: true });
  };

  return (
    <div className="min-h-screen manual-app-shell">
      <HubSidebar />
      <main
        className="lg:ml-[280px] min-h-screen bg-black bg-no-repeat bg-center bg-fixed"
        style={{
          backgroundImage: "url('/hub-internal-bg.png')",
          backgroundAttachment: "fixed",
          backgroundSize: "100% 100%",
        }}
      >
        {impersonating && (
          <div className="sticky top-0 z-40 bg-[#d4af37] text-black border-b-2 border-black/20 shadow-lg">
            <div className="px-6 lg:px-12 py-2.5 flex items-center justify-between gap-4 text-xs font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 min-w-0">
                <Eye size={14} className="shrink-0" />
                <span className="truncate">
                  {t("hub.impersonating", { name: "" })}<span className="underline">{session.nome}</span>
                  {original ? <> — {t("hub.loggedAs", { name: original.nome })}</> : null}
                </span>
              </div>
              <button
                onClick={handleStopImpersonation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black text-[#f9e29f] hover:bg-black/80"
              >
                <LogOut size={12} /> {t("hub.stopImpersonation")}
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
        <LanguageSelector />
      </div>
      <UpdateAppliedModal />
    </div>
  );
}
