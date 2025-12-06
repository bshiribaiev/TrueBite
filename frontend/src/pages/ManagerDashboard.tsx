import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import type { Complaint, Order, DeliveryBid, ManagerDashboardStats } from "../types";
import "../styles/manager.css";
import {
  getPendingUsers,
  getEmployees,
  approveUser,
  updateUserRole,
  type UserWithId,
} from "../services/userService";

import {
  getAllComplaints,
  resolveComplaint,
} from "../services/complaintService";
import { getAllOrdersForManager } from "../services/orderService";
import {
  getPendingBids,
  assignDeliveryToBidder,
} from "../services/deliveryService";



export default function ManagerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
  "overview" | "complaints" | "deliveries" | "orders" | "employees"
>("overview");
  const [stats, setStats] = useState<ManagerDashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pendingBids, setPendingBids] = useState<DeliveryBid[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingUsers, setPendingUsers] = useState<UserWithId[]>([]);
  const [employees, setEmployees] = useState<UserWithId[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
  if (!user) return;
  setLoading(true);
  setError("");

  try {
    if (activeTab === "overview") {
      const data = await api.getManagerStats();
      setStats(data);
    } else if (activeTab === "complaints") {
      const data = await getAllComplaints();   // 👈 Firestore now
      setComplaints(data);
    } else if (activeTab === "deliveries") {
      const data = await getPendingBids();   // 👈 Firestore now
      setPendingBids(data);
    } else if (activeTab === "orders") {
      const data = await getAllOrdersForManager();   // 👈 Firestore
      setOrders(data);
    } else if (activeTab === "employees") {
      const [pending, emps] = await Promise.all([
        getPendingUsers(),
        getEmployees(),
      ]);
      setPendingUsers(pending);
      setEmployees(emps);
    }
  } catch (err) {
    setError("Failed to load data");
    console.error(err);
  } finally {
    setLoading(false);
  }
};


  const handleResolveComplaint = async (
  complaintId: string,
  resolution: Complaint["status"],
  notes: string
) => {
  try {
    await resolveComplaint(complaintId, resolution, notes); // 👈 Firestore
    await loadData(); // reload complaints from DB so UI updates
    alert("Complaint resolved successfully");
  } catch (err) {
    alert("Failed to resolve complaint");
    console.error(err);
  }
};

  const handleAssignDelivery = async (orderId: string, bidId: string) => {
    try {
      await assignDeliveryToBidder(orderId, bidId);   // 👈 Firestore now
      await loadData();
      alert("Delivery assigned successfully");
    } catch (err) {
      alert("Failed to assign delivery");
      console.error(err);
    }
  };

const handleApproveUser = async (uid: string) => {
  try {
    await approveUser(uid);
    await loadData();
    alert("User approved successfully");
  } catch (err) {
    alert("Failed to approve user");
    console.error(err);
  }
};

const handleSetEmployeeRole = async (uid: string, role: "chef" | "delivery") => {
  try {
    await updateUserRole(uid, role);
    await loadData();
    alert(`Role updated to ${role}`);
  } catch (err) {
    alert("Failed to update role");
    console.error(err);
  }
};


  if (!user || user.role !== "manager") {
    return (
      <div className="panel">
        <h2>Access Denied</h2>
        <p>You must be logged in as a manager to access this page.</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <h1 className="h1">Manager Dashboard</h1>
        <div className="manager-badge">👔 Manager</div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          className={`tab ${activeTab === "employees" ? "active" : ""}`}
          onClick={() => setActiveTab("employees")}
>
          👥 Employees
        </button>
        <button 
          className={`tab ${activeTab === "complaints" ? "active" : ""}`}
          onClick={() => setActiveTab("complaints")}
        >
          ⚠️ Complaints
          {complaints.filter(c => c.status === "PENDING").length > 0 && (
            <span className="badge">{complaints.filter(c => c.status === "PENDING").length}</span>
          )}
        </button>
        <button 
          className={`tab ${activeTab === "deliveries" ? "active" : ""}`}
          onClick={() => setActiveTab("deliveries")}
        >
          🚚 Delivery Bids
        </button>
        <button 
          className={`tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          📦 All Orders
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {activeTab === "overview" && stats && (
              <OverviewTab stats={stats} />
            )}
            {activeTab === "complaints" && (
              <ComplaintsTab 
                complaints={complaints} 
                onResolve={handleResolveComplaint}
              />
            )}
            {activeTab === "deliveries" && (
              <DeliveryBidsTab 
                bids={pendingBids} 
                onAssign={handleAssignDelivery}
              />
            )}
            {activeTab === "orders" && (
  <OrdersTab orders={orders} />
)}
{activeTab === "employees" && (
  <EmployeesTab
    pendingUsers={pendingUsers}
    employees={employees}
    onApprove={handleApproveUser}
    onSetRole={handleSetEmployeeRole}
  />
)}
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: ManagerDashboardStats }) {
  return (
    <div className="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.pendingComplaints}</div>
          <div className="stat-label">Pending Complaints</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeDeliveries}</div>
          <div className="stat-label">Active Deliveries</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">${stats.dailyRevenue.toLocaleString()}</div>
          <div className="stat-label">Daily Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.averageOrderValue.toFixed(2)}</div>
          <div className="stat-label">Avg Order Value</div>
        </div>
      </div>

      <div className="leaderboards">
        <div className="leaderboard">
          <h3>🏆 Top Chefs</h3>
          <div className="leaderboard-list">
            {stats.topChefs.map((chef, index) => (
              <div key={chef.id} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="name">{chef.name}</span>
                <span className="stats">
                  <span className="rating">⭐ {chef.rating.toFixed(1)}</span>
                  <span className="count">{chef.orders} orders</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="leaderboard">
          <h3>🚀 Top Delivery Personnel</h3>
          <div className="leaderboard-list">
            {stats.topDeliveryPersons.map((dp, index) => (
              <div key={dp.id} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="name">{dp.name}</span>
                <span className="stats">
                  <span className="rating">⭐ {dp.rating.toFixed(1)}</span>
                  <span className="count">{dp.deliveries} deliveries</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplaintsTab({ 
  complaints, 
  onResolve 
}: { 
  complaints: Complaint[]; 
  onResolve: (id: string, resolution: Complaint["status"], notes: string) => void;
}) {
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);
  const [resolution, setResolution] = useState<Complaint["status"]>("RESOLVED_NO_ACTION");
  const [notes, setNotes] = useState("");

  const pendingComplaints = complaints.filter(c => c.status === "PENDING");
  const resolvedComplaints = complaints.filter(c => c.status !== "PENDING");

  const handleResolve = (complaintId: string) => {
    if (!notes.trim()) {
      alert("Please add resolution notes");
      return;
    }
    onResolve(complaintId, resolution, notes);
    setSelectedComplaint(null);
    setNotes("");
    setResolution("RESOLVED_NO_ACTION");
  };

  return (
    <div className="complaints-tab">
      <div className="section">
        <h3>Pending Complaints ({pendingComplaints.length})</h3>
        {pendingComplaints.length === 0 ? (
          <div className="empty-state">No pending complaints</div>
        ) : (
          <div className="complaints-list">
            {pendingComplaints.map(complaint => (
              <div key={complaint.id} className="complaint-card">
                <div className="complaint-header">
                  <span className="complaint-id">#{complaint.id}</span>
                  <span className="complaint-type">{complaint.targetType.toUpperCase()}</span>
                  <span className="complaint-date">
                    {new Date(complaint.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="complaint-body">
                  <div className="detail-row">
                    <span className="label">Customer:</span>
                    <span>{complaint.customerName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Order:</span>
                    <span>#{complaint.orderId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Target:</span>
                    <span>{complaint.targetName}</span>
                  </div>
                  <div className="complaint-description">
                    <strong>Description:</strong>
                    <p>{complaint.description}</p>
                  </div>
                </div>
                
                {selectedComplaint === complaint.id ? (
                  <div className="resolution-form">
                    <label>
                      Resolution Type:
                      <select 
                        className="input"
                        value={resolution}
                        onChange={e => setResolution(e.target.value as Complaint["status"])}
                      >
                        <option value="RESOLVED_NO_ACTION">No Action Needed</option>
                        <option value="RESOLVED_WARNING">Issue Warning</option>
                        <option value="RESOLVED_REFUND">Issue Refund</option>
                        <option value="CANCELLED">Cancel/Invalid</option>
                      </select>
                    </label>
                    <label>
                      Manager Notes:
                      <textarea
                        className="input"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Add resolution notes..."
                      />
                    </label>
                    <div className="resolution-actions">
                      <button 
                        className="btn"
                        onClick={() => handleResolve(complaint.id)}
                      >
                        Resolve Complaint
                      </button>
                      <button 
                        className="btn ghost"
                        onClick={() => setSelectedComplaint(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="btn"
                    onClick={() => setSelectedComplaint(complaint.id)}
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h3>Resolved Complaints ({resolvedComplaints.length})</h3>
        <div className="complaints-list">
          {resolvedComplaints.slice(0, 5).map(complaint => (
            <div key={complaint.id} className="complaint-card resolved">
              <div className="complaint-header">
                <span className="complaint-id">#{complaint.id}</span>
                <span className={`status-badge ${complaint.status.toLowerCase()}`}>
                  {complaint.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="complaint-body">
                <div className="detail-row">
                  <span className="label">Target:</span>
                  <span>{complaint.targetName}</span>
                </div>
                {complaint.managerNotes && (
                  <div className="manager-notes">
                    <strong>Resolution:</strong>
                    <p>{complaint.managerNotes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliveryBidsTab({ 
  bids, 
  onAssign 
}: { 
  bids: DeliveryBid[]; 
  onAssign: (orderId: string, bidId: string) => void;
}) {
  // Group bids by order
  const bidsByOrder = bids.reduce((acc, bid) => {
    if (!acc[bid.orderId]) {
      acc[bid.orderId] = [];
    }
    acc[bid.orderId].push(bid);
    return acc;
  }, {} as Record<string, DeliveryBid[]>);

  return (
    <div className="delivery-bids-tab">
      {Object.keys(bidsByOrder).length === 0 ? (
        <div className="empty-state">No pending bids</div>
      ) : (
        Object.entries(bidsByOrder).map(([orderId, orderBids]) => (
          <div key={orderId} className="order-bids">
            <h3>Order #{orderId.slice(0, 8)} - {orderBids.length} Bid(s)</h3>
            <div className="bids-list">
              {orderBids
                .sort((a, b) => b.reputationScore - a.reputationScore)
                .map(bid => (
                  <div key={bid.id} className="bid-card">
                    <div className="bid-header">
                      <span className="delivery-person">{bid.deliveryPersonName}</span>
                      <span className="reputation">⭐ {bid.reputationScore.toFixed(1)}</span>
                    </div>
                    <div className="bid-details">
                      <div className="detail-row">
                        <span className="label">ETA:</span>
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
                    <button 
                      className="btn"
                      onClick={() => onAssign(orderId, bid.id)}
                    >
                      Assign Delivery
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function OrdersTab({ orders }: { orders: Order[] }) {
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "ALL">("ALL");

  const filteredOrders = statusFilter === "ALL" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const statuses: Array<Order["status"] | "ALL"> = [
    "ALL", "CREATED", "IN_KITCHEN", "READY_FOR_DELIVERY", 
    "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"
  ];

  return (
    <div className="orders-tab">
      <div className="filter-bar">
        <label>Filter by Status:</label>
        <select 
          className="input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as Order["status"] | "ALL")}
        >
          {statuses.map(status => (
            <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="orders-list">
        {filteredOrders.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <span className="order-id">#{order.id.slice(0, 8)}</span>
              <span className={`status-badge ${order.status.toLowerCase()}`}>
                {order.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="order-details">
              <div className="detail-row">
                <span className="label">Customer:</span>
                <span>{order.customerName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Items:</span>
                <span>{Array.isArray(order.items) ? order.items.length : 0}</span>
              </div>
              <div className="detail-row">
                <span className="label">Total:</span>
                <span>${order.totalPrice.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Created:</span>
                <span>{new Date(order.createdAt).toLocaleString()}</span>
              </div>
              {order.deliveryPersonId && (
                <div className="detail-row">
                  <span className="label">Delivery Person:</span>
                  <span>ID: {order.deliveryPersonId.slice(0, 8)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function EmployeesTab({
  pendingUsers,
  employees,
  onApprove,
  onSetRole,
}: {
  pendingUsers: UserWithId[];
  employees: UserWithId[];
  onApprove: (uid: string) => void;
  onSetRole: (uid: string, role: "chef" | "delivery") => void;
}) {
  return (
    <div className="employees-tab">
      <div className="section">
        <h3>Pending Registrations ({pendingUsers.length})</h3>
        {pendingUsers.length === 0 ? (
          <div className="empty-state">No pending registrations</div>
        ) : (
          <div className="employees-list">
            {pendingUsers.map((u) => (
              <div key={u.id} className="employee-card">
                <div className="employee-main">
                  <span className="name">{u.name}</span>
                  <span className="email">{u.email}</span>
                </div>
                <div className="employee-meta">
                  <span>Requested as: {u.accountType ?? "unknown"}</span>
                </div>
                <button
                  className="btn"
                  onClick={() => onApprove(u.id)}
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h3>Employees (Chef / Delivery)</h3>
        {employees.length === 0 ? (
          <div className="empty-state">No employees found</div>
        ) : (
          <div className="employees-list">
            {employees.map((emp) => (
              <div key={emp.id} className="employee-card">
                <div className="employee-main">
                  <span className="name">{emp.name}</span>
                  <span className="email">{emp.email}</span>
                </div>
                <div className="employee-meta">
                  <span>Account: {emp.accountType}</span>
                  <span>Role: {emp.role}</span>
                  <span>Status: {emp.status}</span>
                </div>
                <div className="employee-actions">
                  <button
                    className="btn"
                    onClick={() => onSetRole(emp.id, "chef")}
                  >
                    Set Chef
                  </button>
                  <button
                    className="btn"
                    onClick={() => onSetRole(emp.id, "delivery")}
                  >
                    Set Delivery
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}