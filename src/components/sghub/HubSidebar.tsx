import { LayoutGrid, PlusCircle, Globe2, Users, Settings, LogOut, Menu, X, User as UserIcon, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuthSession } from "@/lib/auth-store";
import { hasPermission } from "@/lib/permissions";

const BRAND_LOGO_URL = "/alpha-logo.png";

interface NavItem { to: string; label: string; icon: typeof LayoutGrid; ownerOnly?: boolean; permission?: string; }

const ITEMS: NavItem[] = [
  { to: "/hub", label: "Início", icon: LayoutGrid, permission: "promocoes.ver" },
  { to: "/hub/promocoes/nova", label: "Criar Promoção", icon: PlusCircle, permission: "promocoes.criar" },
  { to: "/hub/locais", label: "Gerenciar Locais", icon: Globe2, permission: "locais.ver" },
  { to: "/hub/contas", label: "Contas de Acesso", icon: Users, permission: "contas.ver" },
  { to: "/hub/permissoes", label: "Permissões", icon: ShieldCheck, ownerOnly: true },
  { to: "/hub/configuracoes", label: "Configurações", icon: Settings, permission: "configuracoes.ver" },
];

export default function HubSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { session, logout } = useAuthSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string) => {
    if (to === "/hub") return pathname === "/hub";
    return pathname.startsWith(to);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg text-[#d4af37]"
        aria-label="Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-[#0a0a0a] border-r border-white/5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-transform
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 overflow-y-auto flex flex-col`}
      >
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src={BRAND_LOGO_URL} alt="SantaGroup" className="h-12 w-12 object-contain drop-shadow-[0_0_18px_rgba(212,175,55,0.4)]" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-display font-bold text-lg tracking-tight whitespace-nowrap">SANTAGROUP</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono whitespace-nowrap">CONFIG. HUB INGAME</p>
            </div>
          </div>

          <nav className="space-y-1">
            {ITEMS.filter((item) => {
              if (item.ownerOnly) return (session?.tipo || "").toUpperCase() === "OWNER";
              return !item.permission || hasPermission(session, item.permission);
            }).map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${active
                      ? "bg-[#d4af37] text-black shadow-[0_0_15px_rgba(212,175,55,0.25)] font-bold"
                      : "text-white/60 hover:text-white hover:bg-white/5"}`}
                >
                  <Icon size={18} className={active ? "text-black" : "group-hover:text-[#d4af37] transition-colors"} />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37]">
              <UserIcon size={20} />
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{session?.nome || "Convidado"}</p>
              <p className="text-[10px] text-[#d4af37] font-black uppercase tracking-tighter truncate">
                {session?.tipo || "Acesso"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" />
      )}
    </>
  );
}
