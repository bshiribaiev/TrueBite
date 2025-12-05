import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { Order, Dish, ChefAnalytics } from "../types";
import {
  getChefOrders,
  getChefDishes,
  updateOrderStatus,
  updateDish,
  createDish,
} from "../services/chefService";

import "../styles/chef.css";

export default function ChefDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "analytics">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [analytics, setAnalytics] = useState<ChefAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
  if (!user) return;
  setLoading(true);
  setError("");

  try {
    if (activeTab === "orders") {
      const data = await getChefOrders(user.id);      // 🔥 Firestore
      setOrders(data);
    } else if (activeTab === "menu") {
      const data = await getChefDishes(user.id);      // 🔥 Firestore
      setDishes(data);
    } else {
      // For now, you can either compute analytics from orders or just stub it.
      // To avoid toFixed issues, we'll just disable analytics if not needed yet.
      setAnalytics(null);
    }
  } catch (err) {
    setError("Failed to load data");
    console.error(err);
  } finally {
    setLoading(false);
  }
};


 const handleStatusChange = async (
  orderId: string,
  newStatus: Order["status"]
) => {
  try {
    await updateOrderStatus(orderId, newStatus);   // 🔥 Firestore
    await loadData();
  } catch (err) {
    alert("Failed to update order status");
    console.error(err);
  }
};

const handleAddDish = async () => {
  if (!user) return;

  const name = window.prompt("Dish name:");
  if (!name) return;

  const priceStr = window.prompt("Price (e.g. 12.99):", "10.00");
  if (!priceStr) return;
  const price = Number(priceStr) || 0;

  const img = window.prompt("Image URL (optional):", "") || "";
  const description = window.prompt("Description (optional):", "") || "";

  try {
    await createDish(user.id, { name, description, price, img });
    await loadData();
  } catch (err) {
    alert("Failed to create dish");
    console.error(err);
  }
};

const toggleDishAvailability = async (
  dishId: string,
  available: boolean
) => {
  try {
    await updateDish(dishId, { available });       // 🔥 Firestore
    await loadData();
  } catch (err) {
    alert("Failed to update dish");
    console.error(err);
  }
};

  if (!user || user.role !== "chef") {
    return (
      <div className="panel">
        <h2>Access Denied</h2>
        <p>You must be logged in as a chef to access this page.</p>
      </div>
    );
  }

  return (
    <div className="chef-dashboard">
      <div className="dashboard-header">
        <h1 className="h1">Chef Dashboard</h1>
        <div className="reputation-badge">
          ⭐ {user.reputationScore.toFixed(1)} Rating
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          📋 Orders
        </button>
        <button 
          className={`tab ${activeTab === "menu" ? "active" : ""}`}
          onClick={() => setActiveTab("menu")}
        >
          🍽️ Menu
        </button>
        <button 
          className={`tab ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          📊 Analytics
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {activeTab === "orders" && (
              <OrdersTab orders={orders} onStatusChange={handleStatusChange} />
            )}
            {activeTab === "menu" && (
              <MenuTab
              dishes={dishes}
              onToggleAvailability={toggleDishAvailability}
              onAddDish={handleAddDish}       // 👈 new prop
              />
            )}
            {activeTab === "analytics" && analytics && (
              <AnalyticsTab analytics={analytics} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrdersTab({ 
  orders, 
  onStatusChange 
}: { 
  orders: Order[]; 
  onStatusChange: (id: string, status: Order["status"]) => void;
}) {
  const newOrders = orders.filter(o => o.status === "CREATED");
  const inKitchen = orders.filter(o => o.status === "IN_KITCHEN");
  const ready = orders.filter(o => o.status === "READY_FOR_DELIVERY");

  return (
    <div className="orders-tab">
      <OrderQueue
        title="New Orders"
        orders={newOrders}
        actionLabel="Start Cooking"
        actionStatus="IN_KITCHEN"
        onAction={onStatusChange}
      />
      <OrderQueue
        title="In Kitchen"
        orders={inKitchen}
        actionLabel="Mark Ready"
        actionStatus="READY_FOR_DELIVERY"
        onAction={onStatusChange}
      />
      <OrderQueue
        title="Ready for Delivery"
        orders={ready}
        actionLabel={null}
        actionStatus={null}
        onAction={onStatusChange}
      />
    </div>
  );
}



function OrderQueue({
  title,
  orders,
  actionLabel,
  actionStatus,
  onAction
}: {
  title: string;
  orders: Order[];
  actionLabel: string | null;
  actionStatus: Order["status"] | null;
  onAction: (id: string, status: Order["status"]) => void;
}) {
  return (
    <div className="order-queue">
      <h3 className="queue-title">{title} ({orders.length})</h3>
      {orders.length === 0 ? (
        <p className="empty-state">No orders in this status</p>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span className="order-id">#{order.id}</span>
                <span className="order-time">
                  {Math.round((Date.now() - order.createdAt.getTime()) / 60000)}m ago
                </span>
              </div>
              <div className="order-customer">{order.customerName}</div>
              <div className="order-items">
                {order.items.map(item => (
                  <div key={item.id} className="order-item">
                    <span>{item.quantity}x {item.dishName}</span>
                  </div>
                ))}
              </div>
              <div className="order-footer">
                <span className="order-total">${order.totalPrice.toFixed(2)}</span>
                {actionLabel && actionStatus && (
                  <button 
                    className="btn btn-sm"
                    onClick={() => onAction(order.id, actionStatus)}
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuTab({
  dishes,
  onToggleAvailability,
  onAddDish,
}: {
  dishes: Dish[];
  onToggleAvailability: (id: string, available: boolean) => void;
  onAddDish: () => void;
}) {
  return (
    <div className="menu-tab">
      <div className="menu-header">
        <h3>My Dishes</h3>
        <button className="btn" onClick={onAddDish}>
  + Add New Dish
</button>

      </div>
      <div className="dish-grid">
        {dishes.map(dish => (
          <div key={dish.id} className="dish-card">
            <img src={dish.img} alt={dish.name} className="dish-img" />
            <div className="dish-body">
              <div className="dish-header">
                <h4 className="dish-name">{dish.name}</h4>
                <span className="dish-rating">⭐ {dish.rating.toFixed(1)}</span>
              </div>
              <p className="dish-description">{dish.description}</p>
              <div className="dish-footer">
                <span className="dish-price">${dish.price.toFixed(2)}</span>
                <label className="availability-toggle">
                  <input
                    type="checkbox"
                    checked={dish.available}
                    onChange={e => onToggleAvailability(dish.id, e.target.checked)}
                  />
                  <span>{dish.available ? "Available" : "Unavailable"}</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ analytics }: { analytics: ChefAnalytics }) {
  return (
    <div className="analytics-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.completedOrders}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">⭐ {analytics.averageRating.toFixed(1)}</div>
          <div className="stat-label">Avg Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${analytics.totalRevenue}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <div className="analytics-section">
        <h3>Popular Dishes</h3>
        <div className="popular-dishes">
          {analytics.popularDishes.map(dish => (
            <div key={dish.dishId} className="popular-dish">
              <span className="dish-name">{dish.dishName}</span>
              <span className="order-count">{dish.orderCount} orders</span>
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-section">
        <h3>Recent Ratings</h3>
        <div className="ratings-list">
          {analytics.recentRatings.map(rating => (
            <div key={rating.id} className="rating-card">
              <div className="rating-header">
                <span className="rating-stars">{"⭐".repeat(rating.score)}</span>
                <span className="rating-time">
                  {new Date(rating.createdAt).toLocaleDateString()}
                </span>
              </div>
              {rating.comment && <p className="rating-comment">{rating.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}