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

import { applyFeedbackToEmployee } from "./userService";


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

// Customer creates a complaint or compliment
export async function createComplaint(params: {
  orderId: string;
  customerId: string;
  customerName: string;
  targetType: "chef" | "delivery";
  targetId: string;         // 👈 NEW
  targetName: string;
  description: string;
  kind?: "COMPLAINT" | "COMPLIMENT";  // default complaint
}) {
  const {
    orderId,
    customerId,
    customerName,
    targetType,
    targetId,
    targetName,
    description,
    kind = "COMPLAINT",
  } = params;

  await addDoc(collection(db, "complaints"), {
    orderId,
    customerId,
    customerName,
    targetType,
    targetId,
    targetName,
    description,
    kind,
    status: "PENDING",
    createdAt: serverTimestamp(),
  });

  // 🔁 auto-update warnings / commendations
  if (kind === "COMPLAINT") {
    await applyFeedbackToEmployee({
      targetId,
      deltaWarnings: 1,
    });
  } else if (kind === "COMPLIMENT") {
    // compliment adds commendation and cancels 1 warning if present
    await applyFeedbackToEmployee({
      targetId,
      deltaWarnings: -1,
      deltaCommendations: 1,
    });
  }
}


// Customer rating for chef or delivery person
// Customer rating for a dish (not a person)
// Customer rating for a dish (also updates chef warnings/commendations)
export async function submitRating(params: {
  orderId: string;
  dishId: string;
  dishName: string;
  customerId: string;
  customerName: string;
  score: number;           // 1–5
  comment?: string;
}) {
  const {
    orderId,
    dishId,
    dishName,
    customerId,
    customerName,
    score,
    comment,
  } = params;

  // 1) Save the rating itself
  await addDoc(collection(db, "ratings"), {
    orderId,
    dishId,
    dishName,
    customerId,
    customerName,
    score,
    comment: comment ?? "",
    createdAt: serverTimestamp(),
  });

  // 2) Look up the dish to find which chef owns it
  try {
    const dishRef = doc(db, "dishes", dishId);   // or "menuItems" if that's your collection
    const dishSnap = await getDoc(dishRef);

    if (!dishSnap.exists()) {
      console.warn("Dish not found for rating; cannot update chef warnings.");
      return;
    }

    const dishData = dishSnap.data() as {
      chefId?: string;
      // ...other fields (name, price, etc.)
    };

    if (!dishData.chefId) {
      console.warn("Dish has no chefId; cannot update chef warnings.");
      return;
    }

    const chefId = dishData.chefId;

    // 3) Convert score → warnings / commendations
    if (score <= 2) {
      // bad rating → warning
      await applyFeedbackToEmployee({
        targetId: chefId,
        deltaWarnings: 1,
      });
    } else if (score >= 4) {
      // good rating → commendation
      await applyFeedbackToEmployee({
        targetId: chefId,
        deltaCommendations: 1,
      });
    }
  } catch (err) {
    console.error("Failed to apply rating feedback to chef", err);
  }
}


// Helper: recompute rating on /dishes/{dishId}
import { getDoc } from "firebase/firestore";

async function updateDishRating(dishId: string, newScore: number) {
  const ref = doc(db, "dishes", dishId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as any;
  const currentCount = data.ratingCount ?? 0;
  const currentAvg = data.rating ?? 0;

  const ratingCount = currentCount + 1;
  const rating =
    (currentAvg * currentCount + newScore) / ratingCount;

  await updateDoc(ref, {
    rating,
    ratingCount,
  });
}


