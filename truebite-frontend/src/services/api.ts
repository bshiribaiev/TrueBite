import type { Order, DeliveryBid, Complaint, Dish, Rating, ChefAnalytics, DeliveryAnalytics, ManagerDashboardStats } from "../types";

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: "o1",
    customerId: "u1",
    customerName: "John Doe",
    items: [
      { id: "oi1", dishId: "d1", dishName: "Spicy Ramen", quantity: 2, price: 14.5 },
      { id: "oi2", dishId: "d3", dishName: "Bibimbap", quantity: 1, price: 13 }
    ],
    totalPrice: 42,
    status: "CREATED",
    createdAt: new Date(Date.now() - 5 * 60000),
    updatedAt: new Date(),
    deliveryAddress: "123 Main St, Apt 4B"
  },
  {
    id: "o2",
    customerId: "u2",
    customerName: "Jane Smith",
    items: [
      { id: "oi3", dishId: "d2", dishName: "Sushi Platter", quantity: 1, price: 22 }
    ],
    totalPrice: 22,
    status: "IN_KITCHEN",
    chefId: "c2",
    createdAt: new Date(Date.now() - 15 * 60000),
    updatedAt: new Date(),
    deliveryAddress: "456 Oak Ave, Unit 12"
  },
  {
    id: "o3",
    customerId: "u3",
    customerName: "Bob Wilson",
    items: [
      { id: "oi4", dishId: "d5", dishName: "Margherita Pizza", quantity: 1, price: 16 }
    ],
    totalPrice: 16,
    status: "READY_FOR_DELIVERY",
    chefId: "c4",
    createdAt: new Date(Date.now() - 25 * 60000),
    updatedAt: new Date(),
    deliveryAddress: "789 Pine Rd"
  },
  {
    id: "o4",
    customerId: "u4",
    customerName: "Alice Brown",
    items: [
      { id: "oi5", dishId: "d4", dishName: "Tacos", quantity: 3, price: 11 }
    ],
    totalPrice: 33,
    status: "OUT_FOR_DELIVERY",
    chefId: "c3",
    deliveryPersonId: "dp1",
    createdAt: new Date(Date.now() - 45 * 60000),
    updatedAt: new Date(),
    deliveryAddress: "321 Elm St",
    estimatedDeliveryTime: new Date(Date.now() + 10 * 60000)
  }
];

// Mock Delivery Bids
export const mockBids: DeliveryBid[] = [
  {
    id: "b1",
    orderId: "o3",
    deliveryPersonId: "dp1",
    deliveryPersonName: "Mike Delivery",
    estimatedTime: 15,
    proposedFee: 5,
    status: "PENDING",
    createdAt: new Date(Date.now() - 2 * 60000),
    reputationScore: 4.7
  },
  {
    id: "b2",
    orderId: "o3",
    deliveryPersonId: "dp2",
    deliveryPersonName: "Sarah Fast",
    estimatedTime: 12,
    proposedFee: 6,
    status: "PENDING",
    createdAt: new Date(Date.now() - 1 * 60000),
    reputationScore: 4.9
  }
];

// Mock Complaints
export const mockComplaints: Complaint[] = [
  {
    id: "c1",
    orderId: "o10",
    customerId: "u5",
    customerName: "Tom Green",
    targetType: "chef",
    targetId: "c1",
    targetName: "Chef Mario",
    description: "Food was cold and missing items",
    status: "PENDING",
    createdAt: new Date(Date.now() - 60 * 60000)
  },
  {
    id: "c2",
    orderId: "o11",
    customerId: "u6",
    customerName: "Lisa White",
    targetType: "delivery",
    targetId: "dp1",
    targetName: "Mike Delivery",
    description: "Delivery took too long, driver was rude",
    status: "PENDING",
    createdAt: new Date(Date.now() - 30 * 60000)
  }
];

// Mock Dishes for Chef Management
export const mockDishesForChef: Dish[] = [
  {
    id: "d1",
    name: "Spicy Ramen",
    description: "Authentic Japanese ramen with spicy miso broth",
    price: 14.5,
    rating: 4.6,
    img: "https://dinnerthendessert.com/wp-content/uploads/2023/08/Spicy-Ramen-10.jpg",
    chefId: "c1",
    chefName: "Chef Mario",
    category: "Japanese",
    available: true,
    tags: ["spicy", "noodles", "soup"]
  },
  {
    id: "d3",
    name: "Bibimbap",
    description: "Korean mixed rice bowl with vegetables and egg",
    price: 13,
    rating: 4.4,
    img: "https://www.siftandsimmer.com/wp-content/uploads/2023/05/bibimbap-featured.jpg",
    chefId: "c1",
    chefName: "Chef Mario",
    category: "Korean",
    available: true,
    tags: ["rice", "vegetables", "healthy"]
  }
];

// Mock Analytics
export const mockChefAnalytics: ChefAnalytics = {
  totalOrders: 156,
  completedOrders: 148,
  averageRating: 4.6,
  totalRevenue: 2340,
  popularDishes: [
    { dishId: "d1", dishName: "Spicy Ramen", orderCount: 45 },
    { dishId: "d3", dishName: "Bibimbap", orderCount: 38 }
  ],
  recentRatings: [
    {
      id: "r1",
      orderId: "o15",
      customerId: "u10",
      targetType: "chef",
      targetId: "c1",
      score: 5,
      comment: "Amazing food! Best ramen I've had",
      createdAt: new Date(Date.now() - 2 * 60 * 60000)
    },
    {
      id: "r2",
      orderId: "o16",
      customerId: "u11",
      targetType: "dish",
      targetId: "d3",
      score: 4,
      comment: "Great bibimbap, generous portions",
      createdAt: new Date(Date.now() - 5 * 60 * 60000)
    }
  ]
};

export const mockDeliveryAnalytics: DeliveryAnalytics = {
  totalDeliveries: 89,
  completedDeliveries: 84,
  failedDeliveries: 2,
  averageRating: 4.7,
  totalEarnings: 445,
  averageDeliveryTime: 18,
  recentRatings: [
    {
      id: "r3",
      orderId: "o20",
      customerId: "u12",
      targetType: "delivery",
      targetId: "dp1",
      score: 5,
      comment: "Very fast and professional",
      createdAt: new Date(Date.now() - 1 * 60 * 60000)
    }
  ]
};

export const mockManagerStats: ManagerDashboardStats = {
  totalUsers: 342,
  totalOrders: 1567,
  pendingComplaints: 2,
  activeDeliveries: 8,
  dailyRevenue: 3420,
  averageOrderValue: 28.50,
  topChefs: [
    { id: "c1", name: "Chef Mario", rating: 4.8, orders: 234 },
    { id: "c2", name: "Chef Sushi", rating: 4.7, orders: 198 }
  ],
  topDeliveryPersons: [
    { id: "dp1", name: "Mike Delivery", rating: 4.9, deliveries: 156 },
    { id: "dp2", name: "Sarah Fast", rating: 4.8, deliveries: 142 }
  ]
};

// API Service (Mock for now)
export const api = {
  // Chef APIs
  getChefOrders: async (chefId: string): Promise<Order[]> => {
    await new Promise(r => setTimeout(r, 500));
    return mockOrders.filter(o => o.chefId === chefId || o.status === "CREATED");
  },

  updateOrderStatus: async (orderId: string, status: Order["status"]): Promise<Order> => {
    await new Promise(r => setTimeout(r, 300));
    const order = mockOrders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    order.status = status;
    order.updatedAt = new Date();
    return order;
  },

  getChefDishes: async (chefId: string): Promise<Dish[]> => {
    await new Promise(r => setTimeout(r, 400));
    return mockDishesForChef;
  },

  updateDish: async (dishId: string, updates: Partial<Dish>): Promise<Dish> => {
    await new Promise(r => setTimeout(r, 300));
    const dish = mockDishesForChef.find(d => d.id === dishId);
    if (!dish) throw new Error("Dish not found");
    Object.assign(dish, updates);
    return dish;
  },

  createDish: async (dish: Omit<Dish, "id" | "rating">): Promise<Dish> => {
    await new Promise(r => setTimeout(r, 400));
    return { ...dish, id: `d${Date.now()}`, rating: 0 } as Dish;
  },

  getChefAnalytics: async (chefId: string): Promise<ChefAnalytics> => {
    await new Promise(r => setTimeout(r, 500));
    return mockChefAnalytics;
  },

  // Delivery APIs
  getAvailableOrders: async (): Promise<Order[]> => {
    await new Promise(r => setTimeout(r, 500));
    return mockOrders.filter(o => o.status === "READY_FOR_DELIVERY");
  },

  getDeliveryOrders: async (deliveryPersonId: string): Promise<Order[]> => {
    await new Promise(r => setTimeout(r, 500));
    return mockOrders.filter(o => o.deliveryPersonId === deliveryPersonId);
  },

  submitBid: async (bid: Omit<DeliveryBid, "id" | "createdAt">): Promise<DeliveryBid> => {
    await new Promise(r => setTimeout(r, 300));
    const newBid: DeliveryBid = {
      ...bid,
      id: `b${Date.now()}`,
      createdAt: new Date()
    };
    mockBids.push(newBid);
    return newBid;
  },

  getMyBids: async (deliveryPersonId: string): Promise<DeliveryBid[]> => {
    await new Promise(r => setTimeout(r, 400));
    return mockBids.filter(b => b.deliveryPersonId === deliveryPersonId);
  },

  getDeliveryAnalytics: async (deliveryPersonId: string): Promise<DeliveryAnalytics> => {
    await new Promise(r => setTimeout(r, 500));
    return mockDeliveryAnalytics;
  },

  // Manager APIs
  getAllComplaints: async (): Promise<Complaint[]> => {
    await new Promise(r => setTimeout(r, 500));
    return mockComplaints;
  },

  resolveComplaint: async (
    complaintId: string, 
    resolution: ComplaintStatus, 
    notes: string
  ): Promise<Complaint> => {
    await new Promise(r => setTimeout(r, 400));
    const complaint = mockComplaints.find(c => c.id === complaintId);
    if (!complaint) throw new Error("Complaint not found");
    complaint.status = resolution;
    complaint.managerNotes = notes;
    complaint.resolvedAt = new Date();
    return complaint;
  },

  getPendingBids: async (orderId?: string): Promise<DeliveryBid[]> => {
    await new Promise(r => setTimeout(r, 400));
    return mockBids.filter(b => 
      b.status === "PENDING" && (!orderId || b.orderId === orderId)
    );
  },

  assignDelivery: async (orderId: string, bidId: string): Promise<Order> => {
    await new Promise(r => setTimeout(r, 300));
    const bid = mockBids.find(b => b.id === bidId);
    const order = mockOrders.find(o => o.id === orderId);
    if (!bid || !order) throw new Error("Not found");
    
    bid.status = "ACCEPTED";
    order.deliveryPersonId = bid.deliveryPersonId;
    order.status = "ASSIGNED";
    order.updatedAt = new Date();
    
    // Decline other bids
    mockBids.filter(b => b.orderId === orderId && b.id !== bidId)
      .forEach(b => b.status = "DECLINED");
    
    return order;
  },

  getManagerStats: async (): Promise<ManagerDashboardStats> => {
    await new Promise(r => setTimeout(r, 600));
    return mockManagerStats;
  },

  getAllOrders: async (status?: Order["status"]): Promise<Order[]> => {
    await new Promise(r => setTimeout(r, 500));
    return status ? mockOrders.filter(o => o.status === status) : mockOrders;
  }
};