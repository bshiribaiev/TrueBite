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
  increment,
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
};
export type UserWithId = UserProfile & {
  id: string;
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

  const newWarnings = Math.max(0, currentWarnings + deltaWarnings);
  const newCommendations = Math.max(0, currentCommendations + deltaCommendations);

  await updateDoc(ref, {
    warnings: newWarnings,
    commendations: newCommendations,
    updatedAt: serverTimestamp(),
  });
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

// Approve a user registration
export async function approveUser(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { status: "approved" });
}

// Change an employee's role (e.g. "chef" or "delivery")
export async function updateUserRole(uid: string, role: Role) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { role });
}
// Increment a user's warnings count by 1
export async function incrementUserWarnings(uid: string) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    warnings: increment(1),
  });
}


