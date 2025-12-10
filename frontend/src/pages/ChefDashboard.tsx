// frontend/src/pages/ChefDashboard.tsx
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

  // 🆕 Modal state
  const [showDishModal, setShowDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

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
      } else if (activeTab === "menu") {
        const data = await getChefDishes(user.id);
        setDishes(data);
      } else {
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

  // 🆕 Open modal for adding new dish
  const handleAddDish = () => {
    setEditingDish(null);
    setShowDishModal(true);
  };

  // 🆕 Open modal for editing existing dish
  const handleEditDish = (dish: Dish) => {
    setEditingDish(dish);
    setShowDishModal(true);
  };

  // 🆕 Save dish (create or update)
  const handleSaveDish = async (dishData: {
    name: string;
    description: string;
    price: number;
    img: string;
    vipOnly: boolean;
  }) => {
    if (!user) return;

    try {
      if (editingDish) {
        // Update existing dish
        await updateDish(editingDish.id, dishData);
      } else {
        // Create new dish
        await createDish(user.id, dishData);
      }
      
      await loadData();
      setShowDishModal(false);
      setEditingDish(null);
    } catch (err) {
      alert("Failed to save dish");
      console.error(err);
    }
  };

  const toggleDishAvailability = async (
    dishId: string,
    available: boolean
  ) => {
    try {
      await updateDish(dishId, { available });
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
                onAddDish={handleAddDish}
                onEditDish={handleEditDish}
              />
            )}
            {activeTab === "analytics" && analytics && (
              <AnalyticsTab analytics={analytics} />
            )}
          </>
        )}
      </div>

      {/* 🆕 Dish Modal */}
      {showDishModal && (
        <DishModal
          dish={editingDish}
          onSave={handleSaveDish}
          onClose={() => {
            setShowDishModal(false);
            setEditingDish(null);
          }}
        />
      )}
    </div>
  );
}

// 🆕 Dish Modal Component
function DishModal({
  dish,
  onSave,
  onClose,
}: {
  dish: Dish | null;
  onSave: (data: {
    name: string;
    description: string;
    price: number;
    img: string;
    vipOnly: boolean;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(dish?.name || "");
  const [description, setDescription] = useState(dish?.description || "");
  const [price, setPrice] = useState(dish?.price.toString() || "");
  const [img, setImg] = useState(dish?.img || "");
  const [vipOnly, setVipOnly] = useState(dish?.vipOnly || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a dish name");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price");
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      img: img.trim(),
      vipOnly,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{dish ? "Edit Dish" : "Add New Dish"}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="dish-form">
          <div className="form-group">
            <label>Dish Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wagyu Beef Steak"
              required
            />
          </div>

          <div className="form-group">
            <label>Price *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 12.99"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your dish..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input
              type="url"
              value={img}
              onChange={(e) => setImg(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* 🆕 VIP Toggle */}
          <div className="form-group vip-toggle-group">
            <label className="toggle-label">
              <span className="toggle-text">
                <span className="toggle-title">
                  {vipOnly ? "👑 VIP-Only Dish" : "Regular Dish"}
                </span>
                <span className="toggle-subtitle">
                  {vipOnly
                    ? "Only visible to VIP customers"
                    : "Available to all customers"}
                </span>
              </span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={vipOnly}
                  onChange={(e) => setVipOnly(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {dish ? "Update Dish" : "Create Dish"}
            </button>
          </div>
        </form>
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
  onEditDish,
}: {
  dishes: Dish[];
  onToggleAvailability: (id: string, available: boolean) => void;
  onAddDish: () => void;
  onEditDish: (dish: Dish) => void;
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
            {/* VIP Badge */}
            {dish.vipOnly && (
              <div className="vip-badge">
                👑 VIP
              </div>
            )}
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
              {/* 🆕 Edit Button */}
              <button
                className="btn btn-sm btn-edit"
                onClick={() => onEditDish(dish)}
              >
                ✏️ Edit
              </button>
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