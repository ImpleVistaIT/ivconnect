import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "../api/client";

export interface AuthUser {
  userId: number;
  userName: string;
  roles: string[];
  employee: {
    employeeCode: string;
    fullName: string;
    firstName: string;
    email: string;
    designation: string;
    department: string | null;
  } | null;
}

interface MeResponse {
  employeeId: number | null;
  roles: string[];
  permissions: string[];
}

interface EmployeeMeResponse {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  firstName: string;
  officialEmail: string;
  designation: string;
  department: string | null;
}

async function loadUser(): Promise<AuthUser> {
  const me = await api<MeResponse>("/auth/me");
  const employee = me.employeeId ? await api<EmployeeMeResponse>("/employees/me") : null;
  return {
    userId: me.employeeId ?? 0,
    userName: employee?.officialEmail ?? "",
    roles: me.roles,
    employee: employee
      ? {
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          firstName: employee.firstName,
          email: employee.officialEmail,
          designation: employee.designation,
          department: employee.department,
        }
      : null,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    loadUser()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token } = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: username, password }),
    });
    tokenStore.set(token);
    setUser(await loadUser());
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Token already invalid or server unreachable: still sign out locally.
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
