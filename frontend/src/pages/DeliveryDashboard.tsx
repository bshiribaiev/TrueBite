import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAvailableOrdersForBidding,
  getMyBids,
  getActiveDeliveries,
  submitDeliveryBid,
  updateDeliveryStatus,
  getDeliveryAnalytics,
} from "../services/deliveryService";
import type { Order, DeliveryBid, DeliveryAnalytics } from "../types";
import "../styles/delivery.css";

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"available" | "mybids" | "active" | "analytics">("available");
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myBids, setMyBids] = useState<DeliveryBid[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<DeliveryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bidFormData, setBidFormData] = useState<{ orderId: string; estimatedTime: number }>({
    orderId: "",
    estimatedTime: 15
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      if (activeTab === "available") {
        const data = await getAvailableOrdersForBidding();
        setAvailableOrders(data);
      } else if (activeTab === "mybids") {
        const data = await getMyBids(user.id);
        setMyBids(data);
      } else if (activeTab === "active") {
        const data = await getActiveDeliveries(user.id);
        setActiveDeliveries(data);
      } else {
        const data = await getDeliveryAnalytics(user.id);
        setAnalytics(data);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (orderId: string, estimatedTime: number) => {
    if (!user) return;
    
    try {
      await submitDeliveryBid({
        orderId,
        deliveryPersonId: user.id,
        deliveryPersonName: user.name,
        estimatedTime,
        reputationScore: user.reputationScore ?? 4.5,
      });
      alert("Bid submitted successfully!");
      await loadData();
    } catch (err) {
      alert("Failed to submit bid");
      console.error(err);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      await updateDeliveryStatus(orderId, newStatus);
      await loadData();
    } catch (err) {
      alert("Failed to update delivery status");
      console.error(err);
    }
  };

  if (!user || user.role !== "delivery") {
    return (
      <div className="panel">
        <h2>Access Denied</h2>
        <p>You must be logged in as a delivery person to access this page.</p>
      </div>
    );
  }

  return (
    <div className="delivery-dashboard">
      <div className="dashboard-header">
        <h1 className="h1">Delivery Dashboard</h1>
        <div className="reputation-badge">
          ⭐ {(user.reputationScore ?? 4.5).toFixed(1)} Rating
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === "available" ? "active" : ""}`}
          onClick={() => setActiveTab("available")}
        >
          🛵 Available Orders
        </button>
        <button 
          className={`tab ${activeTab === "mybids" ? "active" : ""}`}
          onClick={() => setActiveTab("mybids")}
        >
          📝 My Bids
        </button>
        <button 
          className={`tab ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          🚀 Active Deliveries
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
            {activeTab === "available" && (
              <AvailableOrdersTab 
                orders={availableOrders} 
                onSubmitBid={handleSubmitBid}
                bidFormData={bidFormData}
                setBidFormData={setBidFormData}
              />
            )}
            {activeTab === "mybids" && (
              <MyBidsTab bids={myBids} />
            )}
            {activeTab === "active" && (
              <ActiveDeliveriesTab 
                deliveries={activeDeliveries} 
                onUpdateStatus={handleUpdateDeliveryStatus}
              />
            )}
            {activeTab === "analytics" && analytics && (
              <DeliveryAnalyticsTab analytics={analytics} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AvailableOrdersTab({ 
  orders, 
  onSubmitBid,
  bidFormData,
  setBidFormData
}: { 
  orders: Order[]; 
  onSubmitBid: (orderId: string, estimatedTime: number) => void;
  bidFormData: { orderId: string; estimatedTime: number };
  setBidFormData: (data: { orderId: string; estimatedTime: number }) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const handleBidSubmit = (orderId: string) => {
    const estimatedTime = bidFormData.orderId === orderId ? bidFormData.estimatedTime : 15;
    onSubmitBid(orderId, estimatedTime);
    setSelectedOrder(null);
    setBidFormData({ orderId: "", estimatedTime: 15 });
  };

  return (
    <div className="available-orders-tab">
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders available for bidding right now.</p>
          <p className="muted">Check back soon for new delivery opportunities!</p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <div key={order.id} className="delivery-order-card">
              <div className="order-info">
                <div className="order-header">
                  <span className="order-id">#{order.id.slice(0, 8)}</span>
                  <span className="order-price">${order.totalPrice.toFixed(2)}</span>
                </div>
                <div className="order-details">
                  <div className="detail-row">
                    <span className="label">Customer:</span>
                    <span>{order.customerName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Address:</span>
                    <span>{order.deliveryAddress || "Address not provided"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Items:</span>
                    <span>{Array.isArray(order.items) ? order.items.length : 0} item(s)</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Ready:</span>
                    <span>
                      {order.updatedAt 
                        ? `${Math.round((Date.now() - new Date(order.updatedAt).getTime()) / 60000)}m ago`
                        : "Just now"}
                    </span>
                  </div>
                </div>
              </div>
              
              {selectedOrder === order.id ? (
                <div className="bid-form">
                  <label>
                    Estimated Time (minutes):
                    <input
                      type="number"
                      className="input"
                      min="5"
                      max="60"
                      value={bidFormData.orderId === order.id ? bidFormData.estimatedTime : 15}
                      onChange={e => setBidFormData({ 
                        orderId: order.id, 
                        estimatedTime: parseInt(e.target.value) || 15 
                      })}
                    />
                  </label>
                  <div className="bid-actions">
                    <button 
                      className="btn"
                      onClick={() => handleBidSubmit(order.id)}
                    >
                      Submit Bid
                    </button>
                    <button 
                      className="btn ghost"
                      onClick={() => setSelectedOrder(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="btn"
                  onClick={() => setSelectedOrder(order.id)}
                >
                  Place Bid
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyBidsTab({ bids }: { bids: DeliveryBid[] }) {
  const getStatusBadge = (status: DeliveryBid["status"]) => {
    const badges = {
      PENDING: { class: "pending", text: "⏳ Pending" },
      ACCEPTED: { class: "accepted", text: "✅ Accepted" },
      DECLINED: { class: "declined", text: "❌ Declined" }
    };
    const badge = badges[status];
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="mybids-tab">
      {bids.length === 0 ? (
        <div className="empty-state">
          <p>You haven't placed any bids yet.</p>
        </div>
      ) : (
        <div className="bids-list">
          {bids.map(bid => (
            <div key={bid.id} className="bid-card">
              <div className="bid-header">
                <span className="order-id">Order #{bid.orderId.slice(0, 8)}</span>
                {getStatusBadge(bid.status)}
              </div>
              <div className="bid-details">
                <div className="detail-row">
                  <span className="label">Estimated Time:</span>
                  <span>{bid.estimatedTime} minutes</span>
                </div>
                {bid.proposedFee && (
                  <div className="detail-row">
                    <span className="label">Fee:</span>
                    <span>${bid.proposedFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Submitted:</span>
                  <span>{new Date(bid.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveDeliveriesTab({ 
  deliveries, 
  onUpdateStatus 
}: { 
  deliveries: Order[]; 
  onUpdateStatus: (id: string, status: Order["status"]) => void;
}) {
  return (
    <div className="active-deliveries-tab">
      {deliveries.length === 0 ? (
        <div className="empty-state">
          <p>No active deliveries.</p>
        </div>
      ) : (
        <div className="deliveries-list">
          {deliveries.map(delivery => (
            <div key={delivery.id} className="active-delivery-card">
              <div className="delivery-header">
                <span className="order-id">#{delivery.id.slice(0, 8)}</span>
                <span className={`status-badge ${delivery.status.toLowerCase()}`}>
                  {delivery.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="delivery-details">
                <div className="detail-row">
                  <span className="label">Customer:</span>
                  <span>{delivery.customerName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Address:</span>
                  <span>{delivery.deliveryAddress || "Address not provided"}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Total:</span>
                  <span>${delivery.totalPrice.toFixed(2)}</span>
                </div>
                {delivery.estimatedDeliveryTime && (
                  <div className="detail-row">
                    <span className="label">ETA:</span>
                    <span>{new Date(delivery.estimatedDeliveryTime).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
              <div className="delivery-actions">
                {delivery.status === "ASSIGNED" && (
                  <button 
                    className="btn"
                    onClick={() => onUpdateStatus(delivery.id, "OUT_FOR_DELIVERY")}
                  >
                    Start Delivery
                  </button>
                )}
                {delivery.status === "OUT_FOR_DELIVERY" && (
                  <button 
                    className="btn"
                    onClick={() => onUpdateStatus(delivery.id, "DELIVERED")}
                  >
                    Mark Delivered
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

function DeliveryAnalyticsTab({ analytics }: { analytics: DeliveryAnalytics }) {
  const completionRate = analytics.totalDeliveries > 0
    ? ((analytics.completedDeliveries / analytics.totalDeliveries) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="analytics-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics.totalDeliveries}</div>
          <div className="stat-label">Total Deliveries</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.completedDeliveries}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">⭐ {analytics.averageRating.toFixed(1)}</div>
          <div className="stat-label">Avg Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${analytics.totalEarnings}</div>
          <div className="stat-label">Total Earnings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{analytics.averageDeliveryTime} min</div>
          <div className="stat-label">Avg Delivery Time</div>
        </div>
      </div>

      {analytics.recentRatings.length > 0 && (
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
      )}
    </div>
  );
}