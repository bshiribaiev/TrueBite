// src/services/complaintService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc, 
} from "firebase/firestore";
import type { Complaint } from "../types";

// Get all complaints (pending + resolved)
export async function getAllComplaints(): Promise<Complaint[]> {
  const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;

    // normalize createdAt so your `new Date(...)` call in the UI works
    let createdAt = data.createdAt;
    if (createdAt?.toDate) {
      createdAt = createdAt.toDate().toISOString();
    }

    return {
      id: d.id,
      ...data,
      createdAt,
    } as Complaint;
  });
}

// Resolve a complaint (update status + manager notes)
export async function resolveComplaint(
  complaintId: string,
  resolution: Complaint["status"],
  notes: string
) {
  const ref = doc(db, "complaints", complaintId);
  await updateDoc(ref, {
    status: resolution,
    managerNotes: notes,
    resolvedAt: serverTimestamp(),
  });
}
export type NewComplaintPayload = {
  customerId: string;
  customerName: string;
  orderId: string;
  targetType: "CHEF" | "DELIVERY" | "ORDER";
  targetId: string;
  targetName: string;
  description: string;
};

export async function createComplaint(data: NewComplaintPayload) {
  await addDoc(collection(db, "complaints"), {
    ...data,
    status: "PENDING",
    managerNotes: "",
    createdAt: serverTimestamp(),
  });
}

