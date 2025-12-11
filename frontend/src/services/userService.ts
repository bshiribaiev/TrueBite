// src/services/userService.ts
import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

import type { Role } from "../types"; // you already have Role type

export type UserProfile = {
  email: string;
  name: string;
  role: Role;
  status: "pending" | "approved" | "rejected";
  accountType?: "customer" | "employee" | "manager"; // 👈 NEW
  deposit?: number;
  warnings?: number;
  salary?: number;
  commendations?: number;
  reputationScore?: number;
  fired?: boolean;
    // 🔥 NEW FIELDS
  isVip?: boolean; // for later VIP logic
  blacklisted?: boolean;
  accountStatus?: "active" | "blacklisted" | "closed" | "close_requested";
};
export type UserWithId = UserProfile & {
  id: string;
};
export type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  deposit: number;
  warnings: number;
  isVip: boolean;
  blacklisted: boolean;
  accountStatus?: "active" | "blacklisted" | "closed" | "close_requested";
};

export async function applyFeedbackToEmployee(params: {
  targetId: string;
  deltaWarnings?: number;
  deltaCommendations?: number;
}) {
  const { targetId, deltaWarnings = 0, deltaCommendations = 0 } = params;
  const ref = doc(db, "users", targetId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as UserProfile;
  const currentWarnings = data.warnings ?? 0;
  const currentCommendations = data.commendations ?? 0;
  const currentRole = data.role;

  let newWarnings = Math.max(0, currentWarnings + deltaWarnings);
  const newCommendations = Math.max(0, currentCommendations + deltaCommendations);

  // VIP DOWNGRADE LOGIC
  const updates: any = {
    warnings: newWarnings,
    commendations: newCommendations,
    updatedAt: serverTimestamp(),
  };

  // CHECK VIP DOWNGRADE (2 warnings → downgrade to registered, clear warnings)
  if (currentRole === "vip" && newWarnings >= 2) {
    console.log(`⚠️ VIP ${targetId} reached 2 warnings! Downgrading to Registered and clearing warnings.`);
    
    updates.role = "registered";
    updates.VIP = false;
    updates.isVip = false;
    updates.warnings = 0; // CLEAR WARNINGS after downgrade
    updates.vipSince = null;
    updates.downgradeReason = "2 warnings";
    updates.downgradedAt = serverTimestamp();
    
    newWarnings = 0; // Update local variable too
  }
  
  // CHECK REGISTERED DEREGISTRATION (3 warnings → blacklist)
  else if (currentRole === "registered" && newWarnings >= 3) {
    console.log(`🚫 Registered user ${targetId} reached 3 warnings! Blacklisting account.`);
    
    updates.blacklisted = true;
    updates.accountStatus = "blacklisted";
    updates.role = "visitor"; // Demote to visitor
    updates.deregisteredReason = "3 warnings";
    updates.deregisteredAt = serverTimestamp();
  }

  await updateDoc(ref, updates);
  
  // Return the action taken for logging/notifications
  if (currentRole === "vip" && newWarnings === 0 && deltaWarnings > 0) {
    return { action: "vip_downgraded", message: "VIP downgraded to Registered. Warnings cleared." };
  } else if (currentRole === "registered" && updates.blacklisted) {
    return { action: "deregistered", message: "User has been deregistered and blacklisted." };
  }
  
  return { action: "warnings_updated", warnings: newWarnings };
}

// src/services/userService.ts
export async function updateEmployeeStats(
  uid: string,
  data: Partial<{
    salary: number;
    warnings: number;
    commendations: number;
    fired: boolean;
    status: "pending" | "approved" | "rejected";
  }>
) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Create or overwrite a user document in /users
export async function setUserProfile(
  uid: string,
  profile: UserProfile
) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    ...profile,
    deposit: profile.deposit ?? 0,
    warnings: profile.warnings ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Fetch a user document from /users
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserStats(
  uid: string,
  updates: { deposit?: number; warnings?: number }
) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Get users whose registration is still pending (any accountType)
export async function getPendingUsers(): Promise<UserWithId[]> {
  const q = query(collection(db, "users"), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as UserProfile),
  }));
}

// Get employees (accountType === "employee"), regardless of current role
export async function getEmployees(): Promise<UserWithId[]> {
  const q = query(
    collection(db, "users"),
    where("accountType", "==", "employee")
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as UserProfile),
  }));
}

export async function getAllCustomers(): Promise<CustomerSummary[]> {
  const snap = await getDocs(collection(db, "users"));

  const customers: CustomerSummary[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as UserProfile;

    // Only include real customers
    if (data.accountType !== "customer") {
      return;
    }

    customers.push({
      id: docSnap.id,
      name: data.name,
      email: data.email,
      deposit: data.deposit ?? 0,
      warnings: data.warnings ?? 0,
      isVip: data.isVip ?? false,
      blacklisted: data.blacklisted ?? false,
      accountStatus: data.accountStatus, // can be undefined, matches optional
    });
  });

  return customers;
}


// Manager: clear customer's balance and close/blacklist the account
export async function clearAndCloseCustomerAccount(uid: string) {
  const ref = doc(db, "users", uid);

  await updateDoc(ref, {
    deposit: 0,
    accountStatus: "closed",
    blacklisted: false,         // keep them blocked
    updatedAt: serverTimestamp(),
  });
}
export async function clearDepositOnly(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    deposit: 0,
    updatedAt: serverTimestamp(),
  });
}
export async function clearAndBlacklistCustomerAccount(uid: string) {
  const ref = doc(db, "users", uid);

  await updateDoc(ref, {
    deposit: 0,
    blacklisted: true,
    accountStatus: "blacklisted",  // <--- forces rejection on login
    warnings: 3,                    // always locked due to limit
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function requestAccountClosure(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    accountStatus: "close_requested",
    closureRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}



// Approve a user registration
export async function approveUser(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { status: "approved" });
}
export async function rejectUser(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { status: "rejected" });
}
// Change an employee's role (e.g. "chef" or "delivery")
export async function updateUserRole(uid: string, role: Role) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { role });
}
// Increment a user's warnings and auto-handle VIP downgrade/blacklist
export async function incrementUserWarnings(uid: string) {
  // Use the main applyFeedbackToEmployee function which has all the correct logic
  return await applyFeedbackToEmployee({
    targetId: uid,
    deltaWarnings: 1,
  });
}

