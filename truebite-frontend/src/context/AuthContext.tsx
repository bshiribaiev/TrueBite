import { createContext, useContext, useState, type ReactNode } from "react";

type Role = "visitor" | "registered" | "vip" | "manager" | "chef" | "delivery";

export interface User {
  id: string;
  name: string;
  role: Role;
  deposit: number;
  warnings: number;
}

interface AuthContextValue {
  user: User | null;
  login: (name: string, role?: Role) => void;
  logout: () => void;
  addWarning: () => void;
  addDeposit: (amount: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (name: string, role: Role = "registered") => {
    setUser({
      id: "u1",
      name,
      role,
      deposit: role === "vip" ? 120 : 75,
      warnings: 0,
    });
  };

  const logout = () => setUser(null);
  const addWarning = () => setUser(u => (u ? { ...u, warnings: u.warnings + 1 } : u));
  const addDeposit = (amount: number) =>
    setUser(u => (u ? { ...u, deposit: u.deposit + amount } : u));

  return (
    <AuthContext.Provider value={{ user, login, logout, addWarning, addDeposit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
