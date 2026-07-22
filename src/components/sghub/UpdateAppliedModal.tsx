import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";

const UPDATE_KEY = "sghub_update_v5_permissions_details";

export default function UpdateAppliedModal() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(UPDATE_KEY) === "ok") return;
    setVisible(true);
    const t1 = window.setTimeout(() => setDone(true), 1100);
    const t2 = window.setTimeout(() => {
      window.localStorage.setItem(UPDATE_KEY, "ok");
      setVisible(false);
    }, 2100);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/30 bg-[#0b0b0b] p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]">
          {done ? <CheckCircle2 size={28} /> : <RefreshCw size={28} className="animate-spin" />}
        </div>
        <h2 className="font-display text-xl font-black text-white">
          {done ? "Atualizado" : "Atualizando"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          {done
            ? "Permissões e detalhes da promoção prontos."
            : "Aplicando a nova versão do Hub Ingame."}
        </p>
      </div>
    </div>
  );
}