import { useState, useEffect } from "react";

const STORAGE_KEY = "sghub_session";
const IMPERSONATE_BACKUP_KEY = "sghub_session_original";
const SESSION_EVENT = "sghub_session_changed";


export interface SgHubSession {
  accountId: string;
  nome: string;
  email?: string;
  tipo?: string;
  permissoes?: string[];
  logoUrl?: string;
}

export function getStoredSession(): SgHubSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const asStr = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
    const asStringArray = (v: unknown) => Array.isArray(v) ? v.map(String).filter(Boolean) : undefined;
    const sanitized: SgHubSession = {
      accountId: asStr(parsed.accountId),
      nome: asStr(parsed.nome) || "Convidado",
      email: asStr(parsed.email) || undefined,
      tipo: asStr(parsed.tipo) || undefined,
      permissoes: asStringArray(parsed.permissoes),
      logoUrl: asStr(parsed.logoUrl) || undefined,
    };
    if (!sanitized.accountId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return sanitized;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: SgHubSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function startImpersonation(target: SgHubSession) {
  if (typeof window === "undefined") return;
  const current = window.localStorage.getItem(STORAGE_KEY);
  const backup = window.localStorage.getItem(IMPERSONATE_BACKUP_KEY);
  // Só cria backup se ainda não estivermos impersonando (não sobrescrever o original)
  if (current && !backup) {
    window.localStorage.setItem(IMPERSONATE_BACKUP_KEY, current);
  }
  setStoredSession(target);
}

export function stopImpersonation() {
  if (typeof window === "undefined") return;
  const backup = window.localStorage.getItem(IMPERSONATE_BACKUP_KEY);
  window.localStorage.removeItem(IMPERSONATE_BACKUP_KEY);
  if (backup) {
    window.localStorage.setItem(STORAGE_KEY, backup);
    window.dispatchEvent(new Event(SESSION_EVENT));
  } else {
    setStoredSession(null);
  }
}

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(IMPERSONATE_BACKUP_KEY);
}

export function getOriginalSession(): SgHubSession | null {
  if (typeof window === "undefined") return null;
  const backup = window.localStorage.getItem(IMPERSONATE_BACKUP_KEY);
  if (!backup) return null;
  try {
    const parsed = JSON.parse(backup) as SgHubSession;
    return parsed?.accountId ? parsed : null;
  } catch {
    return null;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<SgHubSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(getStoredSession());
      setImpersonating(isImpersonating());
    };
    sync();
    setHydrated(true);
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const login = (data: SgHubSession) => {
    setStoredSession(data);
    setSession(data);
  };

  const logout = () => {
    // Ao sair, limpa impersonação também
    if (typeof window !== "undefined") window.localStorage.removeItem(IMPERSONATE_BACKUP_KEY);
    setStoredSession(null);
    setSession(null);
    setImpersonating(false);
  };

  return { session, hydrated, login, logout, impersonating };
}

