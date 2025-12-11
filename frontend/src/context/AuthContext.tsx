// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth } from "../firebaseConfig";
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getUserProfile, setUserProfile, updateUserStats } from "../services/userService";
import type { Role, User } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (
    name: string,
    email: string,
    password: string,
    role: Role,
    accountType: "customer" | "employee" | "manager"
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getDashboardRouteForRole: (role: Role) => string;

  // 👇 new helpers for balance / warnings
  addDeposit: (amount: number) => void;
  deductDeposit: (amount: number) => void;
  addWarning: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Runs whenever Firebase auth state changes
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(
    auth,
    async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(fbUser.uid);

        if (profile && ((profile.accountStatus && profile.accountStatus === "closed") || profile.blacklisted)) {
          console.warn("Blocked login for closed/blacklisted account");
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        if (profile) {
          const formatted: User = {
            id: fbUser.uid,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            status: profile.status,              // 👈 add this
            // 🔥 pull from Firestore, fall back to 0
            deposit: profile.deposit ?? 0,
            warnings: profile.warnings ?? 0,
            reputationScore: profile.reputationScore ?? 0,
            salary: profile.salary ?? undefined,
            commendations: profile.commendations ?? undefined,
            fired: profile.fired ?? false,
          };
          setUser(formatted);
        } else {
          // no profile yet – optional: create a basic one or just set a minimal user
          const fallback: User = {
            id: fbUser.uid,
            name: fbUser.displayName ?? "Customer",
            email: fbUser.email ?? "",
            role: "registered",
            status: "pending",
            deposit: 0,
            warnings: 0,
            reputationScore: 0,
          };
          setUser(fallback);
        }
      } catch (e) {
        console.error("Failed to load profile", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
  );

  return unsubscribe;
}, []);


  const register = async (
  name: string,
  email: string,
  password: string,
  role: Role,
  accountType: "customer" | "employee" | "manager"
) => {
  const { createUserWithEmailAndPassword } = await import("firebase/auth");
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  await setUserProfile(cred.user.uid, {
    name,
    email,
    role,
    status: "pending",
    accountType,   // 👈 save what they picked (customer/employee/manager)
  });
};
  const addDeposit = (amount: number) => {
  setUser((prev) => {
    if (!prev) return prev;
    const newDeposit = (prev.deposit ?? 0) + amount;

    // fire-and-forget Firestore update
    updateUserStats(prev.id, { deposit: newDeposit }).catch(console.error);

    return { ...prev, deposit: newDeposit };
  });
};

const deductDeposit = (amount: number) => {
  setUser((prev) => {
    if (!prev) return prev;
    const newDeposit = Math.max(0, (prev.deposit ?? 0) - amount);

    updateUserStats(prev.id, { deposit: newDeposit }).catch(console.error);

    return { ...prev, deposit: newDeposit };
  });
};

const addWarning = async () => {
  if (!user) return;
  
  try {
    const { applyFeedbackToEmployee } = await import("../services/userService");
    
    const result = await applyFeedbackToEmployee({
      targetId: user.id,
      deltaWarnings: 1,
    });
    
    console.log("Warning applied:", result);
    
    const updatedProfile = await getUserProfile(user.id);
    if (updatedProfile) {
      setUser({
        ...user,
        role: updatedProfile.role,
        warnings: updatedProfile.warnings ?? 0,
        isVip: updatedProfile.isVip,
      });
      
      if (result?.action === "vip_downgraded") {
        alert("⚠️ You have been downgraded from VIP to Registered due to 2 warnings. Your warnings have been cleared.");
        window.location.reload(); // Force page refresh to update UI
      } else if (result?.action === "deregistered") {
        alert("🚫 Your account has been deregistered due to 3 warnings.");
        await signOut(auth);
      }
    }
  } catch (error) {
    console.error("Failed to add warning:", error);
  }
};

  // Login → Firebase Auth → load profile
const login = async (email: string, password: string) => {
  const { signInWithEmailAndPassword } = await import("firebase/auth");
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // 🔍 fetch profile immediately after auth
  const profile = await getUserProfile(cred.user.uid);

  if (profile) {
    if (profile.accountStatus && profile.accountStatus === "closed") {
      await signOut(auth);
      throw new Error("This account has been closed. Please contact support.");
    }
    if (profile.blacklisted) {
      await signOut(auth);
      throw new Error("This account has been blacklisted.");
    }
  }

  // if OK, onAuthStateChanged will fill `user` as usual
};

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const getDashboardRouteForRole = (role: Role): string => {
    switch (role) {
      case "manager": return "/manager";
      case "chef": return "/chef";
      case "delivery": return "/delivery";
      default: return "/dashboard";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        getDashboardRouteForRole,
        addDeposit,
        deductDeposit,
        addWarning,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
