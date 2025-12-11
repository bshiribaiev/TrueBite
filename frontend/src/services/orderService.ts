// src/services/orderService.ts
import { db } from "../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { getUserProfile } from "./userService";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

import type { Order } from "../types";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

export async function createOrder(
  userId: string,
  userName: string,
  items: CartItem[]
) {
  // 1) GET USER PROFILE FIRST
  const user = await getUserProfile(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // 2) GET CURRENT ORDER COUNT
  const existingOrders = await getOrdersForUser(userId);
  const currentOrderCount = existingOrders.length;

  // 3) CALCULATE SUBTOTAL
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // 4) CALCULATE DISCOUNT (5% for VIP)
  let discount = 0;
  if (user.role === "vip") {
    discount = subtotal * 0.05;
  }

  // 5) CALCULATE DELIVERY FEE (FREE EVERY 3RD ORDER FOR VIP)
  let deliveryFee = 5.00; // Default $5 delivery
  const isThirdOrder = (currentOrderCount + 1) % 3 === 0;
  
  if (user.role === "vip" && isThirdOrder) {
    deliveryFee = 0; // FREE DELIVERY on 3rd, 6th, 9th order, etc.
    console.log(`🎉 FREE DELIVERY! This is order #${currentOrderCount + 1} for VIP ${userName}`);
  }

  // 6) CALCULATE TOTAL
  const totalPrice = subtotal - discount + deliveryFee;

  // 7) CREATE ORDER IN FIREBASE
  const docRef = await addDoc(collection(db, "deliveries"), {
    customerId: userId,
    customerName: userName,
    items: items.map((i) => ({
      dishId: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    subtotal,
    discount,
    deliveryFee,
    totalPrice,
    status: "CREATED",
    createdAt: serverTimestamp(),
    deliveryStatus: "PENDING",
    assignedDriverId: null,
    assignedDriverName: null,
    bids: [],
    // Store for reference
    orderNumber: currentOrderCount + 1,
    isFreeDelivery: user.role === "vip" && isThirdOrder,
  });

  // 8) CHECK AND UPGRADE VIP (for non-VIP users)
  await checkAndUpgradeVIP(userId);

  return docRef.id;
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const q = query(
    collection(db, "deliveries"),
    where("customerId", "==", userId)
  );

  const snap = await getDocs(q);

  const orders: Order[] = snap.docs.map((d) => {
    const data = d.data() as any;

    const createdAt =
      data.createdAt?.toDate?.() ?? new Date();

    const rawItems = Array.isArray(data.items) ? data.items : [];

    const items = rawItems.map((it: any, idx: number) => ({
      id: it.id ?? it.dishId ?? String(idx),
      dishName: it.dishName ?? it.name ?? "Item",
      quantity: it.quantity ?? 1,
    }));

    return {
      id: d.id,
      chefId: data.chefId ?? null,
      chefName: data.chefName ?? null,
      deliveryPersonId: data.assignedDriverId ?? data.deliveryPersonId ?? null,
      deliveryPersonName:
      data.assignedDriverName ?? data.deliveryPersonName ?? null,
      customerName: data.customerName ?? "Customer",
      items,
      totalPrice: data.totalPrice ?? 0,
      status: data.status ?? "CREATED",
      createdAt,
    } as Order;
  });

  orders.sort(
    (a, b) =>
      (b.createdAt as any).getTime() - (a.createdAt as any).getTime()
  );

  return orders;
}

export async function getAllOrdersForManager(): Promise<Order[]> {
  const q = query(collection(db, "deliveries"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;

    let createdAt = data.createdAt;
    if (createdAt?.toDate) {
      createdAt = createdAt.toDate().toISOString();
    }

    // normalize items
    const items = Array.isArray(data.items) ? data.items : [];

    return {
      id: d.id,
      ...data,
      items,         // 👈 ensure items is always an array
      createdAt,
      chefId: data.chefId ?? null,
  chefName: data.chefName ?? null,
  deliveryPersonId: data.assignedDriverId ?? data.deliveryPersonId ?? null,
  deliveryPersonName:
    data.assignedDriverName ?? data.deliveryPersonName ?? null,
    } as Order;
  });
}

async function checkAndUpgradeVIP(userId: string): Promise<void> {
  const user = await getUserProfile(userId);
  
  if (!user || user.role === "vip") {
    return; // Already VIP or user not found
  }
  
  // Get all orders for this user
  const orders = await getOrdersForUser(userId);
  
  // Calculate totals
  const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const orderCount = orders.length;
  
  // ✅ CHECK FOR UNRESOLVED COMPLAINTS
  const complaintsQuery = query(
    collection(db, "complaints"),
    where("customerId", "==", userId),
    where("status", "==", "PENDING")
  );
  const complaintsSnap = await getDocs(complaintsQuery);
  const unresolvedComplaints = complaintsSnap.size;
  
  // Check if qualifies for VIP
  // Must meet ONE of the monetary/order requirements AND have no unresolved complaints
  const meetsSpendingRequirement = totalSpent >= 100;
  const meetsOrderRequirement = orderCount >= 3;
  const hasNoUnresolvedComplaints = unresolvedComplaints === 0;
  
  if ((meetsSpendingRequirement || meetsOrderRequirement) && hasNoUnresolvedComplaints) {
    console.log(`✅ Upgrading user ${userId} to VIP! Spent: $${totalSpent}, Orders: ${orderCount}, Unresolved Complaints: ${unresolvedComplaints}`);
    
    // Upgrade to VIP
    await updateDoc(doc(db, "users", userId), {
      role: "vip",
      VIP: true,
      isVip: true,
      vipSince: serverTimestamp(),
    });
  } else {
    console.log(`❌ Not upgrading user ${userId}. Spent: $${totalSpent}, Orders: ${orderCount}, Unresolved Complaints: ${unresolvedComplaints}`);
  }
}


