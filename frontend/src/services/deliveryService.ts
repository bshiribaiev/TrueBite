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

// Helper function to safely convert any date format to timestamp for sorting
function getTimestamp(date: any): number {
  if (!date) return 0;
  if (date instanceof Date) return date.getTime();
  if (date.toDate) return date.toDate().getTime(); // Firestore Timestamp
  if (date.toMillis) return date.toMillis(); // Another Firestore format
  if (typeof date === 'string') return new Date(date).getTime();
  if (typeof date === 'number') return date;
  return 0;
}

// ============================================
// DELIVERY PERSON FUNCTIONS
// ============================================

/**
 * Get all orders that are ready for delivery (available for bidding)
 * Sorted by newest first (most recent orders at top)
 */
export async function getAvailableOrdersForBidding(): Promise<Order[]> {
  const q = query(
    collection(db, "deliveries"),
    where("status", "==", "READY_FOR_DELIVERY")
  );
  const snap = await getDocs(q);

  const orders = snap.docs
    .map((d) => {
      const data = d.data() as any;
      
      // Skip orders that already have an assigned driver
      if (data.assignedDriverId) return null;

      // Convert Firestore Timestamp to Date safely
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

  // Sort by createdAt descending (newest first)
  orders.sort((a, b) => {
    const timeA = getTimestamp(a.createdAt);
    const timeB = getTimestamp(b.createdAt);
    return timeB - timeA; // Descending (newest first)
  });

  return orders;  
}

/**
 * Submit a bid for an order
 */
type NewDeliveryBidInput = {
  orderId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  estimatedTime: number;
  reputationScore: number;
  proposedFee: number;
};

export async function submitDeliveryBid(bid: NewDeliveryBidInput): Promise<string> {
  const bidRef = await addDoc(collection(db, "bids"), {
    orderId: bid.orderId,
    deliveryPersonId: bid.deliveryPersonId,
    deliveryPersonName: bid.deliveryPersonName,
    estimatedTime: bid.estimatedTime,
    reputationScore: bid.reputationScore,
    proposedFee: bid.proposedFee,
    status: "PENDING",
    createdAt: serverTimestamp(),
  });

  return bidRef.id;
}

export async function getCompletedDeliveriesForDriver(
  driverId: string
): Promise<Order[]> {
  const q = query(
    collection(db, "deliveries"),
    where("assignedDriverId", "==", driverId),
    where("status", "==", "DELIVERED")
  );

  const snap = await getDocs(q);

  const deliveries = snap.docs.map((docSnap) => {
    const data = docSnap.data() as any;

    const mapped: Order = {
      id: docSnap.id,
      customerName: data.customerName ?? "Unknown customer",
      deliveryAddress: data.deliveryAddress ?? "",
      totalPrice: data.totalPrice ?? 0,
      status: data.status ?? "DELIVERED",
      items: data.items ?? [],
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      deliveryPersonId: data.assignedDriverId,
    } as Order;

    return mapped;
  });

  // Sort by createdAt descending (newest first)
  return deliveries.sort((a, b) => {
    const timeA = getTimestamp(a.createdAt);
    const timeB = getTimestamp(b.createdAt);
    return timeB - timeA;
  });
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

  const bids = snap.docs.map((d) => {
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

  // Sort by createdAt descending (newest first)
  return bids.sort((a, b) => {
    const timeA = getTimestamp(a.createdAt);
    const timeB = getTimestamp(b.createdAt);
    return timeB - timeA;
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

  const orders = snap.docs
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

  // Sort by createdAt descending (newest first)
  return orders.sort((a, b) => {
    const timeA = getTimestamp(a.createdAt);
    const timeB = getTimestamp(b.createdAt);
    return timeB - timeA;
  });
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
    deliveryStatus: newStatus,
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

  const bids = snap.docs.map((d) => {
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

  // Sort by createdAt descending (newest first)
  return bids.sort((a, b) => {
    const timeA = getTimestamp(a.createdAt);
    const timeB = getTimestamp(b.createdAt);
    return timeB - timeA;
  });
}

/**
 * Assign delivery to a winning bidder
 */
export async function assignDeliveryToBidder(
  orderId: string,
  winningBidId: string,
  managerNote?: string
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