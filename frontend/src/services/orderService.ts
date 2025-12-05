// src/services/orderService.ts
import { db } from "../firebaseConfig";
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
  // order info
  customerId: userId,
  customerName: userName,
  items: items.map((i) => ({
    dishId: i.id,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
  })),
  totalPrice,
  status: "CREATED",        // for kitchen/manager flow
  createdAt: serverTimestamp(),

  // delivery-related fields (for later driver bidding)
  deliveryStatus: "PENDING",   // or "UNASSIGNED"
  assignedDriverId: null,
  assignedDriverName: null,
  bids: [],                    // you can fill this later with bid objects
});

  return docRef.id;
}

export async function getOrdersForUser(userId: string) {
  const q = query(
    collection(db, "orders"),
    where("customerId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
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
    } as Order;
  });
}


