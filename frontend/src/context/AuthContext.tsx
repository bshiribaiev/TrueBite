// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { User, Role } from "../types";

interface AuthContextType {
  user: User | null;
  login: (name: string, role: Role) => void;
  logout: () => void;
  addDeposit: (amount: number) => void;
  addWarning: () => void;
  isManager: boolean;
  isChef: boolean;
  isDelivery: boolean;
  getDashboardRouteForRole: (role: Role) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "truebite_user";

function createMockUser(name: string, role: Role): User {
  const safeName = name || "Guest";
  const baseReputation =
    role === "chef" || role === "delivery" ? 4.5 : 0;

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    name: safeName,
    email: `${safeName.toLowerCase().replace(/\s+/g, ".")}@truebite.mock`,
    role,
    deposit: 0,
    warnings: 0,
    reputationScore: baseReputation,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Load from localStorage on first render
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        setUser(parsed);
      }
    } catch (e) {
      console.error("Failed to parse stored user", e);
    }
  }, []);

  // Persist whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = (name: string, role: Role) => {
    const newUser = createMockUser(name, role);
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const addDeposit = (amount: number) => {
    setUser((prev) =>
      prev ? { ...prev, deposit: prev.deposit + amount } : prev
    );
  };

  const addWarning = () => {
    setUser((prev) =>
      prev ? { ...prev, warnings: prev.warnings + 1 } : prev
    );
  };

  const getDashboardRouteForRole = (role: Role): string => {
    switch (role) {
      case "manager":
        return "/manager";
      case "chef":
        return "/chef";
      case "delivery":
        return "/delivery";
      // visitor / registered / vip all use the generic dashboard
      default:
        return "/dashboard";
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    addDeposit,
    addWarning,
    isManager: user?.role === "manager",
    isChef: user?.role === "chef",
    isDelivery: user?.role === "delivery",
    getDashboardRouteForRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
