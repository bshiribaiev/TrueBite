// src/services/complaintService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  addDoc, 
  getDoc,
} from "firebase/firestore";
import type { Complaint } from "../types";
import { getUserProfile } from "./userService";

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
  targetType: "chef" | "delivery" | "CUSTOMER";
  targetId: string;
  targetName: string;
  description: string;
  kind?: "COMPLAINT" | "COMPLIMENT";
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

  // CHECK IF COMPLAINANT IS VIP
  const complainant = await getUserProfile(customerId);
  const weight = complainant?.role === "vip" ? 2 : 1;

  await addDoc(collection(db, "complaints"), {
    orderId,
    customerId,
    customerName,
    targetType,
    targetId,
    targetName,
    description,
    kind,
    weight,  // STORE THE WEIGHT
    status: "PENDING",
    createdAt: serverTimestamp(),
  });
}


// ─────────────────────────────────────────────────────────────
// Customer rating for a dish
// Uses UPSERT logic: one rating per dish per order per customer
// Re-submitting will OVERWRITE the previous rating (not create duplicates)
// ─────────────────────────────────────────────────────────────
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

  // Create a deterministic document ID so re-rating overwrites
  // Format: orderId_dishId_customerId
  const ratingDocId = `${orderId}_${dishId}_${customerId}`;
  const ratingRef = doc(db, "ratings", ratingDocId);

  // Check if this rating already exists (to handle dish average correctly)
  const existingRatingSnap = await getDoc(ratingRef);
  const existingScore = existingRatingSnap.exists() 
    ? (existingRatingSnap.data() as any).score 
    : null;

  // Use setDoc to upsert - creates if doesn't exist, overwrites if it does
  await setDoc(ratingRef, {
    orderId,
    dishId,
    dishName,
    customerId,
    customerName,
    score,
    comment: comment ?? "",
    updatedAt: serverTimestamp(),
  });

  // Update the dish's global average rating
  // If overwriting, we need to adjust (remove old score, add new score)
  await updateDishRating(dishId, score, existingScore);

  // Look up the dish to find which chef owns it (for warnings/commendations)
  try {
    const dishRef = doc(db, "dishes", dishId);
    const dishSnap = await getDoc(dishRef);

    if (!dishSnap.exists()) {
      console.warn("Dish not found for rating; cannot update chef warnings.");
      return;
    }

    const dishData = dishSnap.data() as {
      chefId?: string;
    };

    if (!dishData.chefId) {
      console.warn("Dish has no chefId; cannot update chef warnings.");
      return;
    }

    const chefId = dishData.chefId;

    // Only apply chef feedback if this is a NEW rating (not an update)
    // This prevents double-penalizing/rewarding chefs when users change their rating
    if (existingScore === null) {
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
    }
  } catch (err) {
    console.error("Failed to apply rating feedback to chef", err);
  }
}


// Helper: recompute rating on /dishes/{dishId}
// Now handles updates (removing old score, adding new score) to keep average accurate
async function updateDishRating(
  dishId: string, 
  newScore: number, 
  oldScore: number | null = null
) {
  const ref = doc(db, "dishes", dishId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data() as any;
  let currentCount = data.ratingCount ?? 0;
  let currentAvg = data.rating ?? 0;

  let ratingCount: number;
  let rating: number;

  if (oldScore !== null) {
    // UPDATE: Remove old score contribution, add new score
    // Formula: newAvg = (oldAvg * count - oldScore + newScore) / count
    if (currentCount > 0) {
      const totalScore = currentAvg * currentCount - oldScore + newScore;
      rating = totalScore / currentCount;
      ratingCount = currentCount; // Count stays the same
    } else {
      // Edge case: shouldn't happen, but handle gracefully
      rating = newScore;
      ratingCount = 1;
    }
  } else {
    // NEW RATING: Add to the average
    ratingCount = currentCount + 1;
    rating = (currentAvg * currentCount + newScore) / ratingCount;
  }

  await updateDoc(ref, {
    rating,
    ratingCount,
  });
}

export async function createDriverComplaintAgainstCustomer(args: {
  driverId: string;
  driverName: string;
  orderId: string;
  customerName: string;
  description: string;
}) {
  return createComplaint({
    // "customer*" here is actually the reporter (the driver),
    // matching how your generic complaints are structured
    customerId: args.driverId,
    customerName: args.driverName,
    orderId: args.orderId,
    targetType: "CUSTOMER",
    targetId: args.customerName,    // we don't have a separate customerId, so use name
    targetName: args.customerName,
    description: args.description,
  });
}

/**
 * Manager approves or dismisses a complaint
 */
export async function resolveComplaint(params: {
  complaintId: string;
  decision: "approved" | "dismissed";
  managerNotes?: string;
}) {
  const { complaintId, decision, managerNotes } = params;
  
  const complaintRef = doc(db, "complaints", complaintId);
  const snap = await getDoc(complaintRef);
  
  if (!snap.exists()) {
    throw new Error("Complaint not found");
  }
  
  const complaint = snap.data();
  const { targetId, customerId, kind, weight } = complaint;  
  // Update complaint status
  await updateDoc(complaintRef, {
    status: decision === "approved" ? "resolved" : "dismissed",
    managerNotes: managerNotes ?? "",
    resolvedAt: serverTimestamp(),
  });
  
  if (decision === "approved") {
    // Apply the warning/commendation to target
    if (kind === "COMPLAINT") {
      await applyFeedbackToEmployee({
        targetId,
        deltaWarnings: weight,
        deltaCommendations: -weight,
      });
    } else if (kind === "COMPLIMENT") {
      await applyFeedbackToEmployee({
        targetId,
        deltaWarnings: -weight,
        deltaCommendations: weight,
      });
    }
  } else {
    // Frivolous complaint - warn the complainant
    await applyFeedbackToEmployee({
      targetId: customerId,
      deltaWarnings: 1,
    });
  }
}