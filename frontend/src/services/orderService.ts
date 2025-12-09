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
  quantity: number;
};

export async function createOrder(
  userId: string,
  userName: string,
  items: CartItem[]
) {
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const docRef = await addDoc(collection(db, "deliveries"), {
    customerId: userId,
    customerName: userName,
    items: items.map((i) => ({
      dishId: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    totalPrice,
    status: "CREATED",
    createdAt: serverTimestamp(),
    deliveryStatus: "PENDING",
    assignedDriverId: null,
    assignedDriverName: null,
    bids: [],
  });

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
  
  // Check if qualifies for VIP
  if (totalSpent >= 100 || orderCount >= 3) {
    console.log(`Upgrading user ${userId} to VIP! Spent: $${totalSpent}, Orders: ${orderCount}`);
    
    // Upgrade to VIP
    await updateDoc(doc(db, "users", userId), {
      role: "vip",
      VIP: true, // Nick's flag
    });
  }
}


