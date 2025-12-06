// src/services/deliveryService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  addDoc,
  doc,
  serverTimestamp,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { Order, DeliveryBid, DeliveryAnalytics } from "../types";

// ============================================
// DELIVERY PERSON FUNCTIONS
// ============================================

/**
 * Get all orders that are ready for delivery (available for bidding)
 */
export async function getAvailableOrdersForBidding(): Promise<Order[]> {
  const q = query(
    collection(db, "deliveries"),
    where("status", "==", "READY_FOR_DELIVERY")
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => {
      const data = d.data() as any;
      
      // Skip orders that already have an assigned driver
      if (data.assignedDriverId) return null;

      const createdAt = data.createdAt?.toDate?.() ?? new Date();
      const updatedAt = data.updatedAt?.toDate?.() ?? createdAt;

      return {
        id: d.id,
        customerId: data.customerId ?? "",
        customerName: data.customerName ?? "Customer",
        items: Array.isArray(data.items) ? data.items : [],
        totalPrice: data.totalPrice ?? 0,
        status: data.status ?? "READY_FOR_DELIVERY",
        deliveryAddress: data.deliveryAddress ?? "Address not provided",
        createdAt,
        updatedAt,
      } as Order;
    })
    .filter((order): order is Order => order !== null);
}

/**
 * Submit a bid for an order
 */
export async function submitDeliveryBid(bid: {
  orderId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  estimatedTime: number;
  reputationScore: number;
}): Promise<string> {
  const bidRef = await addDoc(collection(db, "bids"), {
    orderId: bid.orderId,
    deliveryPersonId: bid.deliveryPersonId,
    deliveryPersonName: bid.deliveryPersonName,
    estimatedTime: bid.estimatedTime,
    reputationScore: bid.reputationScore,
    status: "PENDING",
    createdAt: serverTimestamp(),
  });

  return bidRef.id;
}

/**
 * Get all bids submitted by a specific delivery person
 */
export async function getMyBids(deliveryPersonId: string): Promise<DeliveryBid[]> {
  const q = query(
    collection(db, "bids"),
    where("deliveryPersonId", "==", deliveryPersonId)
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    const createdAt = data.createdAt?.toDate?.() ?? new Date();

    return {
      id: d.id,
      orderId: data.orderId,
      deliveryPersonId: data.deliveryPersonId,
      deliveryPersonName: data.deliveryPersonName,
      estimatedTime: data.estimatedTime ?? 15,
      proposedFee: data.proposedFee,
      status: data.status ?? "PENDING",
      createdAt,
      reputationScore: data.reputationScore ?? 0,
    } as DeliveryBid;
  });
}

/**
 * Get active deliveries assigned to a delivery person
 */
export async function getActiveDeliveries(deliveryPersonId: string): Promise<Order[]> {
  const q = query(
    collection(db, "deliveries"),
    where("assignedDriverId", "==", deliveryPersonId)
  );
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => {
      const data = d.data() as any;
      const status = data.status;
      
      if (status !== "ASSIGNED" && status !== "OUT_FOR_DELIVERY") {
        return null;
      }

      const createdAt = data.createdAt?.toDate?.() ?? new Date();
      const updatedAt = data.updatedAt?.toDate?.() ?? createdAt;
      const estimatedDeliveryTime = data.estimatedDeliveryTime?.toDate?.();

      return {
        id: d.id,
        customerId: data.customerId ?? "",
        customerName: data.customerName ?? "Customer",
        items: Array.isArray(data.items) ? data.items : [],
        totalPrice: data.totalPrice ?? 0,
        status,
        deliveryAddress: data.deliveryAddress ?? "Address not provided",
        deliveryPersonId: data.assignedDriverId,
        createdAt,
        updatedAt,
        estimatedDeliveryTime,
      } as Order;
    })
    .filter((order): order is Order => order !== null);
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(
  orderId: string,
  newStatus: Order["status"]
): Promise<void> {
  const ref = doc(db, "deliveries", orderId);
  await updateDoc(ref, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get delivery analytics for a delivery person
 */
export async function getDeliveryAnalytics(
  deliveryPersonId: string
): Promise<DeliveryAnalytics> {
  const q = query(
    collection(db, "deliveries"),
    where("assignedDriverId", "==", deliveryPersonId)
  );
  const snap = await getDocs(q);

  let totalDeliveries = snap.docs.length;
  let completedDeliveries = 0;
  let failedDeliveries = 0;

  snap.docs.forEach((d) => {
    const data = d.data() as any;
    if (data.status === "DELIVERED") {
      completedDeliveries++;
    } else if (data.status === "FAILED_DELIVERY" || data.status === "CANCELLED") {
      failedDeliveries++;
    }
  });

  return {
    totalDeliveries,
    completedDeliveries,
    failedDeliveries,
    averageRating: 4.5,
    totalEarnings: completedDeliveries * 5,
    averageDeliveryTime: 18,
    recentRatings: [],
  };
}

// ============================================
// MANAGER FUNCTIONS
// ============================================

/**
 * Get all pending bids (for manager to review)
 */
export async function getPendingBids(orderId?: string): Promise<DeliveryBid[]> {
  let q;
  if (orderId) {
    q = query(
      collection(db, "bids"),
      where("status", "==", "PENDING"),
      where("orderId", "==", orderId)
    );
  } else {
    q = query(
      collection(db, "bids"),
      where("status", "==", "PENDING")
    );
  }

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    const createdAt = data.createdAt?.toDate?.() ?? new Date();

    return {
      id: d.id,
      orderId: data.orderId,
      deliveryPersonId: data.deliveryPersonId,
      deliveryPersonName: data.deliveryPersonName,
      estimatedTime: data.estimatedTime ?? 15,
      proposedFee: data.proposedFee,
      status: data.status ?? "PENDING",
      createdAt,
      reputationScore: data.reputationScore ?? 0,
    } as DeliveryBid;
  });
}

/**
 * Assign delivery to a winning bidder
 */
export async function assignDeliveryToBidder(
  orderId: string,
  winningBidId: string
): Promise<void> {
  // Get the winning bid
  const winningBidRef = doc(db, "bids", winningBidId);
  const winningBidSnap = await getDoc(winningBidRef);
  
  if (!winningBidSnap.exists()) {
    throw new Error("Bid not found");
  }

  const winningBidData = winningBidSnap.data();

  // Update the winning bid status to ACCEPTED
  await updateDoc(winningBidRef, {
    status: "ACCEPTED",
    acceptedAt: serverTimestamp(),
  });

  // Decline all other pending bids for this order
  const otherBidsQuery = query(
    collection(db, "bids"),
    where("orderId", "==", orderId),
    where("status", "==", "PENDING")
  );
  const otherBidsSnap = await getDocs(otherBidsQuery);

  const declinePromises = otherBidsSnap.docs
    .filter((d) => d.id !== winningBidId)
    .map((d) =>
      updateDoc(doc(db, "bids", d.id), {
        status: "DECLINED",
        declinedAt: serverTimestamp(),
      })
    );
  
  await Promise.all(declinePromises);

  // Calculate estimated delivery time
  const estimatedTime = winningBidData.estimatedTime ?? 15;
  const estimatedDeliveryTime = new Date(Date.now() + estimatedTime * 60000);

  // Update the order with the assigned driver
  const orderRef = doc(db, "deliveries", orderId);
  await updateDoc(orderRef, {
    status: "ASSIGNED",
    assignedDriverId: winningBidData.deliveryPersonId,
    assignedDriverName: winningBidData.deliveryPersonName,
    estimatedDeliveryTime: Timestamp.fromDate(estimatedDeliveryTime),
    assignedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}