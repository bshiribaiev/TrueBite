// frontend/src/pages/ChefDashboard.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { Order, Dish } from "../types";
import {
  getChefOrders,
  getChefDishes,
  updateOrderStatus,
} from "../services/chefService";

import "../styles/chef.css";

export default function ChefDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"orders" | "mydishes">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [myDishes, setMyDishes] = useState<Dish[]>([]);
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
        const data = await getChefOrders(user.id);
        setOrders(data);
      } else if (activeTab === "mydishes") {
        const data = await getChefDishes(user.id);
        setMyDishes(data);
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
    if (!user) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      console.error("Order not found in state", orderId);
      return;
    }

    try {
      if (newStatus === "IN_KITCHEN" && !order.chefId) {
        await updateOrderStatus(orderId, newStatus, {
          chefId: user.id,
          chefName: user.name,
        });
      } else {
        await updateOrderStatus(orderId, newStatus);
      }

      await loadData();
    } catch (err) {
      alert("Failed to update order status");
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
          ⭐ {(user.reputationScore ?? 0).toFixed(1)} Rating
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
          className={`tab ${activeTab === "mydishes" ? "active" : ""}`}
          onClick={() => setActiveTab("mydishes")}
        >
          🍽️ My Dishes
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
            {activeTab === "mydishes" && (
              <MyDishesTab dishes={myDishes} chefName={user.name} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrdersTab({
  orders,
  onStatusChange,
}: {
  orders: Order[];
  onStatusChange: (id: string, status: Order["status"]) => void;
}) {
  const newOrders = orders.filter((o) => o.status === "CREATED");
  const inKitchen = orders.filter((o) => o.status === "IN_KITCHEN");
  const ready = orders.filter((o) => o.status === "READY_FOR_DELIVERY");

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
                <span className="order-id">#{(order.id ?? '').slice(0, 8)}</span>
                <span className="order-time">
                  {order.createdAt 
                    ? `${Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m ago`
                    : 'Just now'
                  }
                </span>
              </div>
              <div className="order-customer">{order.customerName ?? 'Customer'}</div>
              <div className="order-items">
                {(order.items ?? []).map((item, idx) => (
                  <div key={item.id ?? idx} className="order-item">
                    <span>{item.quantity ?? 1}x {item.dishName ?? 'Item'}</span>
                  </div>
                ))}
              </div>
              <div className="order-footer">
                <span className="order-total">${(order.totalPrice ?? 0).toFixed(2)}</span>
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

// My Dishes Tab - read-only view of dishes created by this chef
function MyDishesTab({ 
  dishes, 
  chefName 
}: { 
  dishes: Dish[];
  chefName: string;
}) {
  return (
    <div className="my-dishes-tab">
      <div style={{ marginBottom: "16px" }}>
        <p className="muted">
          Dishes you've created. To add or edit dishes, go to the <strong>Menu</strong> page.
        </p>
      </div>

      {dishes.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any dishes yet.</p>
          <p className="muted">Go to the Menu page to add your first dish!</p>
        </div>
      ) : (
        <div className="dish-grid">
          {dishes.map(dish => (
            <div key={dish.id} className="dish-card">
              {/* VIP Badge */}
              {dish.vipOnly && (
                <div className="vip-badge">
                  👑 VIP
                </div>
              )}
              
              {/* Availability Badge */}
              {!dish.available && (
                <div style={{
                  position: "absolute",
                  top: dish.vipOnly ? "40px" : "10px",
                  right: "10px",
                  background: "#ef4444",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}>
                  Unavailable
                </div>
              )}
              
              <img 
                src={dish.img || "/placeholder-dish.jpg"} 
                alt={dish.name} 
                className="dish-img"
                style={{ opacity: dish.available ? 1 : 0.6 }}
              />
              <div className="dish-body">
                <div className="dish-header">
                  <h4 className="dish-name">{dish.name}</h4>
                  <span className="dish-rating">⭐ {(dish.rating ?? 0).toFixed(1)}</span>
                </div>
                {dish.description && (
                  <p className="dish-description">{dish.description}</p>
                )}
                <div className="dish-footer">
                  <span className="dish-price">${(dish.price ?? 0).toFixed(2)}</span>
                  <span style={{ 
                    fontSize: "12px", 
                    color: dish.available ? "#10b981" : "#ef4444",
                    fontWeight: 500
                  }}>
                    {dish.available ? "✓ Available" : "✕ Unavailable"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}