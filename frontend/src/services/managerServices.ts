// src/services/managerService.ts
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { ManagerDashboardStats } from "../types";

export async function getManagerStats(): Promise<ManagerDashboardStats> {
  // Get total users count
  const usersSnapshot = await getDocs(collection(db, "users"));
  const totalUsers = usersSnapshot.size;

  // Get all orders
  const ordersSnapshot = await getDocs(collection(db, "orders"));
  const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const totalOrders = orders.length;

  // Calculate daily revenue (orders from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let dailyRevenue = 0;
  let dailyOrderCount = 0;
  
  orders.forEach((order: any) => {
    const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt);
    if (orderDate >= today) {
      dailyRevenue += order.totalPrice ?? 0;
      dailyOrderCount++;
    }
  });

  // Calculate average order value
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totalPrice ?? 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Get pending complaints count
  const complaintsQuery = query(
    collection(db, "complaints"),
    where("status", "==", "PENDING")
  );
  const complaintsSnapshot = await getDocs(complaintsQuery);
  const pendingComplaints = complaintsSnapshot.size;

  // Get active deliveries (orders that are out for delivery)
  const activeDeliveryStatuses = ["ASSIGNED", "OUT_FOR_DELIVERY"];
  const activeDeliveries = orders.filter((order: any) => 
    activeDeliveryStatuses.includes(order.status)
  ).length;

  // Get top chefs (employees with role "chef", sorted by rating/orders)
  const chefsQuery = query(
    collection(db, "users"),
    where("role", "==", "chef")
  );
  const chefsSnapshot = await getDocs(chefsQuery);
  
  const topChefs = chefsSnapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name ?? "Unknown Chef",
        rating: data.rating ?? data.averageRating ?? 0,
        orders: data.ordersCompleted ?? data.totalOrders ?? 0,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.orders - a.orders)
    .slice(0, 5);

  // Get top delivery personnel
  const deliveryQuery = query(
    collection(db, "users"),
    where("role", "==", "delivery")
  );
  const deliverySnapshot = await getDocs(deliveryQuery);
  
  const topDeliveryPersons = deliverySnapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name ?? "Unknown Driver",
        rating: data.rating ?? data.averageRating ?? 0,
        deliveries: data.deliveriesCompleted ?? data.totalDeliveries ?? 0,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.deliveries - a.deliveries)
    .slice(0, 5);

  return {
    totalUsers,
    totalOrders,
    pendingComplaints,
    activeDeliveries,
    dailyRevenue,
    averageOrderValue,
    topChefs,
    topDeliveryPersons,
  };
}