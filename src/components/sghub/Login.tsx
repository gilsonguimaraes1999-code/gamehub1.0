import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Lock, User, RefreshCw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { appsScriptPost, fetchBootstrap } from "@/lib/sghub-api";
import { setStoredSession, type SgHubSession } from "@/lib/auth-store";
import { toPermissionArray } from "@/lib/permissions";

const SAVED_LOGIN_KEY = "sg_auth";
const LOGIN_LOGO_URL = "/alpha-logo.png";

type LoginStep = "start" | "user" | "password";

interface LoginAccount {
  id?: string;
  usuario?: string;
  nome?: string;
  cargo?: string;
  permissoes?: unknown;
  email?: string;
}
interface LoginResp {
  success?: boolean;
  message?: string;
  data?: LoginAccount & { conta?: LoginAccount; usuario?: LoginAccount | string };
  account?: LoginAccount;
  conta?: LoginAccount;
}

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [step, setStep] = useState<LoginStep>("start");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_LOGIN_KEY);
      if (!saved) return;
      const auth = JSON.parse(saved);
      if (auth.usuario) setUsuario(String(auth.usuario));
      if (auth.senha) setSenha(String(auth.senha));
      if (auth.remember !== undefined) setRememberMe(Boolean(auth.remember));
    } catch {
      localStorage.removeItem(SAVED_LOGIN_KEY);
    }
  }, []);

  const handleStart = () => {
    setError("");
    setStep(usuario ? "password" : "user");
  };

  const handleUserSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!usuario.trim()) { setError("Informe o usuário."); return; }
    setStep("password");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!usuario.trim()) { setStep("user"); setError("Informe o usuário."); return; }
    setError("");
    setLoading(true);
    try {
      const resp = await appsScriptPost<LoginResp>({
        action: "login",
        usuario: usuario.trim(),
        senha: senha,
      });
      const raw = (resp?.account || resp?.conta || resp?.data || {}) as Record<string, unknown>;
      const nested = (raw.conta || raw.usuario || {}) as Record<string, unknown>;
      const acc = { ...nested, ...raw } as Record<string, unknown>;
      if (!resp?.success) {
        throw new Error(resp?.message || "Credenciais não reconhecidas.");
      }
      const asStr = (v: unknown, fallback = ""): string =>
        typeof v === "string" || typeof v === "number" ? String(v) : fallback;
      const session: SgHubSession = {
        accountId: asStr(acc.id, asStr(acc.usuario, usuario)),
        nome: asStr(acc.nome, asStr(acc.usuario, usuario)),
        email: asStr(acc.email) || undefined,
        tipo: asStr(acc.cargo) || undefined,
        permissoes: toPermissionArray(acc.permissoes),
      };
      setStoredSession(session);
      if (rememberMe) {
        localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify({ usuario, senha, remember: true }));
      } else {
        localStorage.removeItem(SAVED_LOGIN_KEY);
      }
      // Pré-carrega todos os dados do site antes de ir para o Início
      setBootLoading(true);
      try {
        await queryClient.prefetchQuery({ queryKey: ["bootstrap"], queryFn: fetchBootstrap, staleTime: 60_000 });
      } catch {
        // segue mesmo em caso de falha — o /hub tratará o erro
      }
      navigate({ to: "/hub", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro no login.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10"
      aria-label="Acesso ao SantaGroup Hub"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/[0.04] blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 flex w-full max-w-[31rem] flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative mb-10 flex items-center justify-center"
        >
          <img
            src={LOGIN_LOGO_URL}
            alt="SantaGroup"
            className="relative z-10 h-auto w-[clamp(160px,32vw,280px)] object-contain drop-shadow-[0_0_18px_rgba(251,160,38,0.18)]"
          />
        </motion.div>

        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#d4af37]">
          Hub Ingame
        </p>
        <h1 className="mt-3 text-[clamp(1.6rem,4vw,3rem)] font-black uppercase leading-[0.96] tracking-tight text-white font-display">
          SantaGroup
        </h1>

        <div className="mt-8 w-full">
          <AnimatePresence mode="wait">
            {step === "start" && (
              <motion.div key="start" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex w-full flex-col items-center gap-5">
                <button
                  type="button"
                  onClick={handleStart}
                  className="group relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-[#d4af37]/50 bg-black/50 px-8 py-4 text-sm font-black uppercase tracking-[0.42em] text-white/85 shadow-[0_0_36px_rgba(212,175,55,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d4af37] hover:text-white hover:shadow-[0_0_48px_rgba(212,175,55,0.36),inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                  <span className="relative z-10">Acessar</span>
                  <span className="absolute inset-0 -translate-x-[110%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[110%]" aria-hidden="true" />
                </button>
              </motion.div>
            )}

            {step === "user" && (
              <motion.form key="user" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: "easeOut" }} onSubmit={handleUserSubmit} className="w-full space-y-4">
                {error && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-red-400">{error}</p>
                )}
                <div className="flex items-center gap-2 rounded-2xl border border-[#d4af37]/60 bg-black/60 pl-4 pr-2 py-2 shadow-[0_0_28px_rgba(212,175,55,0.18)] focus-within:border-[#d4af37]">
                  <User className="h-4 w-4 text-[#d4af37] shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Usuário"
                    className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-white/40 outline-none"
                  />
                  <button type="submit" aria-label="Continuar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black shadow-[0_0_18px_rgba(212,175,55,0.55)] transition-transform hover:-translate-y-0.5">
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              </motion.form>
            )}

            {step === "password" && (
              <motion.form key="password" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35, ease: "easeOut" }} onSubmit={handleSubmit} className="w-full space-y-3">
                {error && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-red-400">{error}</p>
                )}
                <button type="button" onClick={() => { setStep("user"); setError(""); }} className="inline-flex items-center gap-1.5 bg-transparent px-1 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white/50 transition-all hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                  Voltar para usuário
                </button>
                <div className="flex items-center gap-2 rounded-2xl border border-[#d4af37]/60 bg-black/60 pl-4 pr-2 py-2 shadow-[0_0_28px_rgba(212,175,55,0.18)] focus-within:border-[#d4af37]">
                  <Lock className="h-4 w-4 text-[#d4af37] shrink-0" />
                  <input
                    autoFocus
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Senha"
                    className="w-full bg-transparent px-2 py-2 text-sm text-white placeholder-white/40 outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-white/50 hover:text-white px-1" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button type="submit" disabled={loading} aria-label="Entrar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#f9e29f] via-[#d4af37] to-[#8f6b00] text-black shadow-[0_0_18px_rgba(212,175,55,0.55)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                    {loading ? (<span className="h-4 w-4 animate-spin rounded-full border-2 border-black/70 border-t-transparent" />) : (<ArrowRight className="h-5 w-5" strokeWidth={2.5} />)}
                  </button>
                </div>
                <label className="flex items-center justify-center gap-2 pt-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/50 cursor-pointer select-none">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer sr-only" />
                  <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border border-[#d4af37]/60 bg-transparent transition-all peer-checked:bg-[#d4af37] peer-checked:shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
                  Lembrar acesso
                </label>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {bootLoading && (
          <motion.div
            key="boot-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md px-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/30 bg-[#0b0b0b] p-8 text-center shadow-2xl">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37]">
                <RefreshCw size={30} className="animate-spin" />
              </div>
              <h2 className="font-display text-xl font-black text-white uppercase tracking-widest">
                Carregando
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                Preparando o Hub Ingame e sincronizando seus dados...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
