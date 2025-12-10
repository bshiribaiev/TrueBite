// src/services/chefService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Order, Dish } from "../types";

// 🔹 Orders live in "deliveries" collection
export async function getChefOrders(_chefId: string): Promise<Order[]> {
  // For now, return ALL orders. Later you can filter by chefId if you store it.
  const q = query(collection(db, "deliveries"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;

    const createdAt =
      data.createdAt?.toDate?.() ?? new Date(); // Date object for getTime()

    const items = Array.isArray(data.items) ? data.items : [];

    return {
      id: d.id,
      customerName: data.customerName ?? "Customer",
      items: items.map((it: any, idx: number) => ({
        id: it.dishId ?? String(idx),
        dishName: it.name ?? "Item",
        quantity: it.quantity ?? 1,
      })),
      totalPrice: data.totalPrice ?? 0,
      status: data.status ?? "CREATED",
      createdAt,
      chefId: data.chefId ?? null,
      chefName: data.chefName ?? null,
      deliveryPersonId: data.assignedDriverId ?? data.deliveryPersonId ?? null,
      deliveryPersonName:
      data.assignedDriverName ?? data.deliveryPersonName ?? null,
    } as Order;
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: Order["status"],
  extra?: {
    chefId?: string;
    chefName?: string;
    deliveryPersonId?: string;
    deliveryPersonName?: string;
  }
) {
  if (!orderId) {
    throw new Error("updateOrderStatus called without a valid orderId");
  }

  // 👇 this was the broken part in your error
  const ref = doc(db, "deliveries", orderId);  // ✅ 2 segments: collection + doc id

  await updateDoc(ref, {
    status,
    ...(extra ?? {}),
    updatedAt: serverTimestamp(),
  });
}

// 🔹 Dishes live in "dishes" collection
export async function getChefDishes(chefId: string): Promise<Dish[]> {
  const q = query(
    collection(db, "dishes"),
    where("chefId", "==", chefId)
  );
  const snap = await getDocs(q);

  const dishes: Dish[] = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: data.name ?? "Unnamed dish",
      description: data.description ?? "",
      price: data.price ?? 0,
      img: data.img ?? "",
      available: data.available ?? true,
      rating: data.rating ?? 0,
      vipOnly: data.vipOnly ?? false,  // ✅ ADD THIS LINE
    } as Dish;
  });

  dishes.sort((a, b) => a.name.localeCompare(b.name));
  return dishes;
}

export async function updateDish(
  dishId: string,
  updates: Partial<Dish>
): Promise<void> {
  const ref = doc(db, "dishes", dishId);
  await updateDoc(ref, updates as any);
}

// Simple "Add New Dish" helper
export async function createDish(chefId: string, data: {
  name: string;
  description: string;
  price: number;
  img: string;
  vipOnly?: boolean;  
}) {
  await addDoc(collection(db, "dishes"), {
    ...data,
    chefId,
    available: true,
    rating: 0,
    vipOnly: data.vipOnly || false,  
    createdAt: serverTimestamp(),
  });
}
