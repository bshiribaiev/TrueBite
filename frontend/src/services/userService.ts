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
};
export type UserWithId = UserProfile & {
  id: string;
};
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

