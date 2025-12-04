// Core User Types
export type Role = "visitor" | "registered" | "vip" | "manager" | "chef" | "delivery";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  deposit: number;
  warnings: number;
  reputationScore: number;
}

// Order Types
export type OrderStatus = 
  | "CREATED" 
  | "IN_KITCHEN" 
  | "READY_FOR_DELIVERY" 
  | "ASSIGNED"
  | "OUT_FOR_DELIVERY" 
  | "DELIVERED" 
  | "CANCELLED"
  | "FAILED_DELIVERY";

export interface OrderItem {
  id: string;
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  chefId?: string;
  deliveryPersonId?: string;
  createdAt: Date;
  updatedAt: Date;
  deliveryAddress: string;
  estimatedDeliveryTime?: Date;
}

// Dish Types
export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  img: string;
  chefId: string;
  chefName: string;
  category: string;
  available: boolean;
  tags: string[];
}

// Delivery Bid Types
export type BidStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface DeliveryBid {
  id: string;
  orderId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  estimatedTime: number; // minutes
  proposedFee?: number;
  status: BidStatus;
  createdAt: Date;
  reputationScore: number;
}

// Complaint Types
export type ComplaintStatus = "PENDING" | "RESOLVED_NO_ACTION" | "RESOLVED_WARNING" | "RESOLVED_REFUND" | "CANCELLED";
export type ComplaintTarget = "chef" | "delivery" | "system" | "customer";

export interface Complaint {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  targetType: ComplaintTarget;
  targetId: string;
  targetName: string;
  description: string;
  evidence?: string;
  status: ComplaintStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  managerNotes?: string;
}

// Rating Types
export interface Rating {
  id: string;
  orderId: string;
  customerId: string;
  targetType: "dish" | "chef" | "delivery";
  targetId: string;
  score: number; // 1-5
  comment?: string;
  createdAt: Date;
}

// Transaction Types
export type TransactionType = "DEPOSIT" | "PAYMENT" | "REFUND" | "WITHDRAWAL";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: Date;
}

// Analytics Types
export interface ChefAnalytics {
  totalOrders: number;
  completedOrders: number;
  averageRating: number;
  totalRevenue: number;
  popularDishes: { dishId: string; dishName: string; orderCount: number }[];
  recentRatings: Rating[];
}

export interface DeliveryAnalytics {
  totalDeliveries: number;
  completedDeliveries: number;
  failedDeliveries: number;
  averageRating: number;
  totalEarnings: number;
  averageDeliveryTime: number;
  recentRatings: Rating[];
}

export interface ManagerDashboardStats {
  totalUsers: number;
  totalOrders: number;
  pendingComplaints: number;
  activeDeliveries: number;
  dailyRevenue: number;
  averageOrderValue: number;
  topChefs: { id: string; name: string; rating: number; orders: number }[];
  topDeliveryPersons: { id: string; name: string; rating: number; deliveries: number }[];
}