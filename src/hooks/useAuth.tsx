import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Identity, Settings } from "@/types";
import {
  hashPassword,
  identityFromMember,
  loadIdentity,
  makeMember,
  randomSalt,
  saveIdentity,
  verifyAdmin,
  verifyMember,
} from "@/lib/auth";
import { useAppData } from "./useAppData";

interface AuthValue {
  identity: Identity | null;
  isAdmin: boolean;
  enterAsGuest: (name: string) => Promise<Identity>;
  loginMember: (username: string, password: string) => Promise<boolean>;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateIdentity: (patch: Partial<Identity>) => void;
  changeAdminPassword: (newPassword: string) => Promise<Partial<Settings>>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { members, settings, upsertMember } = useAppData();
  const [identity, setIdentity] = useState<Identity | null>(() => loadIdentity());

  useEffect(() => {
    saveIdentity(identity);
  }, [identity]);

  const enterAsGuest = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      const existing = members.find((m) => m.name === trimmed);
      if (existing) {
        if (!existing.active) await upsertMember({ ...existing, active: true });
        const next = identityFromMember(existing);
        setIdentity(next);
        return next;
      }
      const member = makeMember(trimmed, "member");
      await upsertMember(member);
      const next = identityFromMember(member);
      setIdentity(next);
      return next;
    },
    [members, upsertMember]
  );

  const loginMember = useCallback(
    async (username: string, password: string) => {
      const member = await verifyMember(members, username, password);
      if (!member) return false;
      setIdentity(identityFromMember(member));
      return true;
    },
    [members]
  );

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      if (!settings) return false;
      const ok = await verifyAdmin(settings, username, password);
      if (!ok) return false;
      setIdentity({
        memberId: "admin",
        name: "管理员",
        role: "admin",
        color: "hsl(13.5 77% 53.7%)",
      });
      return true;
    },
    [settings]
  );

  const logout = useCallback(() => setIdentity(null), []);

  const updateIdentity = useCallback((patch: Partial<Identity>) => {
    setIdentity((cur) => (cur ? { ...cur, ...patch } : cur));
  }, []);

  const changeAdminPassword = useCallback(async (newPassword: string) => {
    const salt = randomSalt();
    const hash = await hashPassword(newPassword, salt);
    return {
      adminSalt: salt,
      adminPasswordHash: hash,
      adminMustChangePassword: false,
    } as Partial<Settings>;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      identity,
      isAdmin: identity?.role === "admin",
      enterAsGuest,
      loginMember,
      loginAdmin,
      logout,
      updateIdentity,
      changeAdminPassword,
    }),
    [identity, enterAsGuest, loginMember, loginAdmin, logout, updateIdentity, changeAdminPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
