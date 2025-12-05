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
    } as Order;
  });
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: Order["status"]
) {
  const ref = doc(db, "deliveries", orderId);
  await updateDoc(ref, { status: newStatus });
}

// 🔹 Dishes live in "dishes" collection
export async function getChefDishes(chefId: string): Promise<Dish[]> {
  // 🔥 no orderBy here → no index required
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
    } as Dish;
  });

  // sort by name on the client
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
}) {
  await addDoc(collection(db, "dishes"), {
    ...data,
    chefId,
    available: true,
    rating: 0,
    createdAt: serverTimestamp(),
  });
}
