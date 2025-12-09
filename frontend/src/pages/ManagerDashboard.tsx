// frontend/src/pages/ManagerDashboard.tsx
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
  updateEmployeeStats,
  incrementUserWarnings,
  getAllCustomers,
  clearAndCloseCustomerAccount,
  clearDepositOnly,
  clearAndBlacklistCustomerAccount,
  type CustomerSummary,
  updateUserStats,
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
  "overview" | "complaints" | "deliveries" | "orders" | "employees" | "customers"
>("overview");
  const [stats, setStats] = useState<ManagerDashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [pendingBids, setPendingBids] = useState<DeliveryBid[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingUsers, setPendingUsers] = useState<UserWithId[]>([]);
  const [employees, setEmployees] = useState<UserWithId[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);

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
        const data = await getAllComplaints();
        setComplaints(data);
      } else if (activeTab === "deliveries") {
        const data = await getPendingBids();
        setPendingBids(data);
      } else if (activeTab === "orders") {
        const data = await getAllOrdersForManager();
        setOrders(data);
      } else if (activeTab === "employees") {
        const [pending, emps] = await Promise.all([
          getPendingUsers(),
          getEmployees(),
        ]);
        setPendingUsers(pending);
        setEmployees(emps);
      } else if (activeTab === "customers") {
        const data = await getAllCustomers();
        setCustomers(data);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveComplaint = async (
    complaint: Complaint,
    resolution: Complaint["status"],
    notes: string,
    warn: "none" | "target" | "sender"
  ) => {
    try {
      await resolveComplaint(complaint.id, resolution, notes);

      if (warn === "target" && complaint.targetId) {
        await incrementUserWarnings(complaint.targetId);
      } else if (warn === "sender" && complaint.customerId) {
        await incrementUserWarnings(complaint.customerId);
      }

      await loadData();
      alert("Complaint resolved successfully");
    } catch (err) {
      alert("Failed to resolve complaint");
      console.error(err);
    }
  };

  const handleAssignDelivery = async (orderId: string, bidId: string, managerNote?: string) => {
    try {
      await assignDeliveryToBidder(orderId, bidId, managerNote);
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

  const handleGiveBonus = async (emp: UserWithId) => {
    try {
      const currentSalary = emp.salary ?? 50000;
      const newSalary = currentSalary + 5000;

      await updateEmployeeStats(emp.id, {
        salary: newSalary,
      });
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to give bonus");
    }
  };

  const handleDemoteEmployee = async (emp: UserWithId) => {
    try {
      const currentSalary = emp.salary ?? 50000;
      const newSalary = Math.max(0, currentSalary - 5000);

      await updateEmployeeStats(emp.id, {
        salary: newSalary,
      });
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to demote employee");
    }
  };

  const handleFireEmployee = async (emp: UserWithId) => {
    const warnings = emp.warnings ?? 0;
    if (warnings < 6) {
      alert("You can only fire after 6 warnings (complaints / bad ratings).");
      return;
    }

    if (!window.confirm(`Are you sure you want to fire ${emp.name}?`)) {
      return;
    }

    try {
      await updateEmployeeStats(emp.id, {
        fired: true,
        salary: 0,
        status: "rejected",
      });
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to fire employee");
    }
  };

  const handleCloseCustomerAccount = async (customer: CustomerSummary) => {
    const confirmMsg =
      `Close account for ${customer.name} (${customer.email})?\n` +
      `This will clear their deposit and mark the account as closed.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await clearAndCloseCustomerAccount(customer.id);
      await loadData();
      alert("Customer account closed and deposit cleared.");
    } catch (err) {
      console.error(err);
      alert("Failed to close customer account");
    }
  };

  const handleBlacklistCustomer = async (customer: CustomerSummary) => {
    const confirmMsg =
      `BLACKLIST ${customer.name} (${customer.email})?\n` +
      `This will clear their deposit, mark them blacklisted, and prevent future logins.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await clearAndBlacklistCustomerAccount(customer.id);
      await loadData();
      alert("Customer blacklisted and deposit cleared.");
    } catch (err) {
      console.error(err);
      alert("Failed to blacklist customer");
    }
  };

  const handleClearDepositOnly = async (customer: CustomerSummary) => {
    const confirmMsg =
      `Clear deposit for ${customer.name} (${customer.email})?\n` +
      `Their account will remain ${customer.accountStatus ?? "active"}.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await clearDepositOnly(customer.id);
      await loadData();
      alert("Customer deposit cleared.");
    } catch (err) {
      console.error(err);
      alert("Failed to clear deposit");
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
          className={`tab ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          🧾 Customers
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
                onBonus={handleGiveBonus}
                onDemote={handleDemoteEmployee}
                onFire={handleFireEmployee}
              />
            )}
            {activeTab === "customers" && (
              <CustomersTab
                customers={customers}
                onClearDeposit={handleClearDepositOnly}
                onCloseAccount={handleCloseCustomerAccount}
                onBlacklist={handleBlacklistCustomer}
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
          <div className="stat-value">{stats.totalUsers ?? 0}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders ?? 0}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-value">{stats.pendingComplaints ?? 0}</div>
          <div className="stat-label">Pending Complaints</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeDeliveries ?? 0}</div>
          <div className="stat-label">Active Deliveries</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">${(stats.dailyRevenue ?? 0).toLocaleString()}</div>
          <div className="stat-label">Daily Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${(stats.averageOrderValue ?? 0).toFixed(2)}</div>
          <div className="stat-label">Avg Order Value</div>
        </div>
      </div>

      <div className="leaderboards">
        <div className="leaderboard">
          <h3>🏆 Top Chefs</h3>
          <div className="leaderboard-list">
            {(stats.topChefs ?? []).map((chef, index) => (
              <div key={chef.id} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="name">{chef.name}</span>
                <span className="stats">
                  <span className="rating">⭐ {(chef.rating ?? 0).toFixed(1)}</span>
                  <span className="count">{chef.orders ?? 0} orders</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="leaderboard">
          <h3>🚀 Top Delivery Personnel</h3>
          <div className="leaderboard-list">
            {(stats.topDeliveryPersons ?? []).map((dp, index) => (
              <div key={dp.id} className="leaderboard-item">
                <span className="rank">#{index + 1}</span>
                <span className="name">{dp.name}</span>
                <span className="stats">
                  <span className="rating">⭐ {(dp.rating ?? 0).toFixed(1)}</span>
                  <span className="count">{dp.deliveries ?? 0} deliveries</span>
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
  onResolve: (
    complaint: Complaint,
    resolution: Complaint["status"],
    notes: string,
    warn: "none" | "target" | "sender"
  ) => void;
}) {
  const [selectedComplaint, setSelectedComplaint] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const pendingComplaints = complaints.filter((c) => c.status === "PENDING");
  const resolvedComplaints = complaints.filter((c) => c.status !== "PENDING");

  const ensureNotes = () => {
    if (!notes.trim()) {
      alert("Please add resolution notes");
      return false;
    }
    return true;
  };

  const handleDismiss = (complaint: Complaint) => {
    if (!ensureNotes()) return;
    onResolve(complaint, "RESOLVED_NO_ACTION", notes, "none");
    setSelectedComplaint(null);
    setNotes("");
  };

  const handleWarnTarget = (complaint: Complaint) => {
    if (!ensureNotes()) return;
    onResolve(complaint, "RESOLVED_WARNING", notes, "target");
    setSelectedComplaint(null);
    setNotes("");
  };

  const handleWarnSender = (complaint: Complaint) => {
    if (!ensureNotes()) return;
    onResolve(complaint, "RESOLVED_WARNING", notes, "sender");
    setSelectedComplaint(null);
    setNotes("");
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
                  <span className="complaint-id">#{(complaint.id ?? '').slice(0, 8)}</span>
                  <span className="complaint-type">{(complaint.targetType ?? '').toUpperCase()}</span>
                  <span className="complaint-date">
                    {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : 'Unknown'}
                  </span>
                </div>
                <div className="complaint-body">
                  <div className="detail-row">
                    <span className="label">Customer:</span>
                    <span>{complaint.customerName ?? 'Unknown'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Weight:</span>
                    <span style={{ 
                      fontWeight: "bold",
                      color: complaint.weight === 2 ? "#7c3aed" : "#6b7280",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}>
                      {complaint.weight || 1}x
                      {complaint.weight === 2 && (
                        <span style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: "bold"
                        }}>
                          👑 VIP
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Order:</span>
                    <span>#{(complaint.orderId ?? '').slice(0, 8)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Target:</span>
                    <span>{complaint.targetName ?? 'Unknown'}</span>
                  </div>
                  <div className="complaint-description">
                    <strong>Description:</strong>
                    <p>{complaint.description ?? 'No description'}</p>
                  </div>
                </div>
                
                {selectedComplaint === complaint.id ? (
                  <div className="resolution-form">
                    <label>
                      Manager Notes:
                      <textarea
                        className="input"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add resolution notes..."
                      />
                    </label>
                    <div className="resolution-actions">
                      <button className="btn" onClick={() => handleDismiss(complaint)}>
                        Dismiss
                      </button>
                      <button className="btn" onClick={() => handleWarnTarget(complaint)}>
                        Warn Target
                      </button>
                      <button className="btn" onClick={() => handleWarnSender(complaint)}>
                        Warn Sender (Bad Complaint)
                      </button>
                      <button className="btn ghost" onClick={() => setSelectedComplaint(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn" onClick={() => setSelectedComplaint(complaint.id)}>
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
                <span className="complaint-id">#{(complaint.id ?? '').slice(0, 8)}</span>
                <span className={`status-badge ${(complaint.status ?? '').toLowerCase()}`}>
                  {(complaint.status ?? '').replace(/_/g, " ")}
                </span>
              </div>
              <div className="complaint-body">
                <div className="detail-row">
                  <span className="label">Weight:</span>
                  <span style={{ 
                    fontWeight: "bold",
                    color: complaint.weight === 2 ? "#7c3aed" : "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    {complaint.weight || 1}x
                    {complaint.weight === 2 && (
                      <span style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "bold"
                      }}>
                        👑 VIP
                      </span>
                    )}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Target:</span>
                  <span>{complaint.targetName ?? 'Unknown'}</span>
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
  onAssign: (orderId: string, bidId: string, managerNote?: string) => void;
}) {
  const bidsByOrder = bids.reduce((acc, bid) => {
    if (!acc[bid.orderId]) {
      acc[bid.orderId] = [];
    }
    acc[bid.orderId].push(bid);
    return acc;
  }, {} as Record<string, DeliveryBid[]>);

  const handleAssignClick = (orderId: string, selectedBid: DeliveryBid, orderBids: DeliveryBid[]) => {
    const numericFees = orderBids
      .map(b => b.proposedFee)
      .filter((fee): fee is number => typeof fee === "number");

    if (numericFees.length === 0 || selectedBid.proposedFee == null) {
      onAssign(orderId, selectedBid.id);
      return;
    }

    const minFee = Math.min(...numericFees);
    const selectedFee = selectedBid.proposedFee;

    if (selectedFee > minFee) {
      const reason = window.prompt(
        `This bid's fee $${selectedFee.toFixed(2)} is higher than the cheapest bid $${minFee.toFixed(2)}.\n\n` +
        "Please enter a justification memo:"
      );

      if (!reason || !reason.trim()) {
        alert("Justification memo is required when choosing a more expensive bid.");
        return;
      }

      onAssign(orderId, selectedBid.id, reason.trim());
    } else {
      onAssign(orderId, selectedBid.id);
    }
  };

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
                .sort((a, b) => (b.reputationScore ?? 0) - (a.reputationScore ?? 0))
                .map(bid => (
                  <div key={bid.id} className="bid-card">
                    <div className="bid-header">
                      <span className="delivery-person">{bid.deliveryPersonName ?? 'Unknown'}</span>
                      <span className="reputation">⭐ {(bid.reputationScore ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="bid-details">
                      <div className="detail-row">
                        <span className="label">ETA:</span>
                        <span>{bid.estimatedTime ?? 'N/A'} minutes</span>
                      </div>
                      {bid.proposedFee != null && (
                        <div className="detail-row">
                          <span className="label">Fee:</span>
                          <span>${(bid.proposedFee ?? 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span className="label">Submitted:</span>
                        <span>{bid.createdAt ? new Date(bid.createdAt).toLocaleString() : 'Unknown'}</span>
                      </div>
                    </div>
                    <button className="btn" onClick={() => handleAssignClick(orderId, bid, orderBids)}>
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
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const statuses: Array<Order["status"] | "ALL"> = [
    "ALL", "CREATED", "IN_KITCHEN", "READY_FOR_DELIVERY", 
    "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"
  ];

  // Filter orders
  const filteredOrders = statusFilter === "ALL" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="orders-tab-container">
      {/* Filter bar at top, full width */}
      <div className="filter-bar-top">
        <div className="filter-group">
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

        <div className="filter-group">
          <label>Sort by Time:</label>
          <select 
            className="input"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as "newest" | "oldest")}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <div className="filter-info">
          Showing {sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Orders list - full width cards */}
      {sortedOrders.length === 0 ? (
        <div className="empty-state">No orders found</div>
      ) : (
        <div className="orders-list-full">
          {sortedOrders.map(order => (
            <div key={order.id} className="order-card-full">
              <div className="order-card-header">
                <span className="order-id">#{(order.id ?? '').slice(0, 8)}</span>
                <span className={`status-badge ${(order.status ?? 'unknown').toLowerCase()}`}>
                  {(order.status ?? 'UNKNOWN').replace(/_/g, " ")}
                </span>
              </div>
              <div className="order-card-body">
                <div className="order-info-grid">
                  <div className="info-item">
                    <span className="info-label">Customer</span>
                    <span className="info-value">{order.customerName ?? 'Unknown'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Items</span>
                    <span className="info-value">{Array.isArray(order.items) ? order.items.length : 0}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total</span>
                    <span className="info-value">${(order.totalPrice ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created</span>
                    <span className="info-value">
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                  {order.deliveryPersonId && (
                    <div className="info-item">
                      <span className="info-label">Delivery Person</span>
                      <span className="info-value">ID: {order.deliveryPersonId.slice(0, 8)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomersTab({
  customers,
  onClearDeposit,
  onCloseAccount,
  onBlacklist,
}: {
  customers: CustomerSummary[];
  onClearDeposit: (c: CustomerSummary) => void;
  onCloseAccount: (c: CustomerSummary) => void;
  onBlacklist: (c: CustomerSummary) => void;
}) {
  if (customers.length === 0) {
    return (
      <div className="customers-tab">
        <h3>Customers</h3>
        <div className="empty-state">No customers found</div>
      </div>
    );
  }

  return (
    <div className="customers-tab">
      <h3>Customers ({customers.length})</h3>
      <div className="customers-list">
        {customers.map((c) => {
          const status = c.accountStatus ?? "active";

          const canBlacklist =
            c.warnings >= 3 && !c.blacklisted && status !== "blacklisted";

          const canClearDeposit =
            c.deposit > 0 && status !== "closed" && status !== "blacklisted";

          const canCloseAccount =
            c.accountStatus === "close_requested" && !c.blacklisted;

          return (
            <div key={c.id} className="customer-card">
              <div className="customer-main">
                <span className="name">{c.name}</span>
                <span className="email">{c.email}</span>
              </div>

              <div className="customer-meta">
                <span className="meta-item">Deposit: ${(c.deposit ?? 0).toFixed(2)}</span>
                <span className="meta-item">Warnings: {c.warnings ?? 0}</span>
                <span className="meta-item">Status: {status}</span>
                {c.isVip && <span className="badge vip">VIP</span>}
                {c.blacklisted && <span className="badge bad">Blacklisted</span>}
              </div>

              <div className="customer-actions">
                <button
                  className="btn btn-sm"
                  disabled={!canClearDeposit}
                  onClick={() => onClearDeposit(c)}
                >
                  Clear Deposit
                </button>

                <button
                  className="btn btn-sm"
                  disabled={!canCloseAccount}
                  onClick={() => onCloseAccount(c)}
                  title={
                    canCloseAccount
                      ? "Close this account (customer requested closure)"
                      : "Only available when accountStatus = closure_requested"
                  }
                >
                  Close Account
                </button>

                <button
                  className="btn btn-sm btn-danger"
                  disabled={!canBlacklist}
                  onClick={() => onBlacklist(c)}
                  title={
                    canBlacklist
                      ? "Blacklist this customer (3+ warnings)"
                      : "Needs at least 3 warnings and not already blacklisted"
                  }
                >
                  Blacklist
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmployeesTab({
  pendingUsers,
  employees,
  onApprove,
  onSetRole,
  onBonus,
  onDemote,
  onFire,
}: {
  pendingUsers: UserWithId[];
  employees: UserWithId[];
  onApprove: (uid: string) => void;
  onSetRole: (uid: string, role: "chef" | "delivery") => void;
  onBonus: (emp: UserWithId) => void;
  onDemote: (emp: UserWithId) => void;
  onFire: (emp: UserWithId) => void;
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
                <button className="btn" onClick={() => onApprove(u.id)}>
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
            {employees.map((emp) => {
              const salary = emp.salary ?? 50000;
              const warnings = emp.warnings ?? 0;
              const commendations = emp.commendations ?? 0;

              const canDemote = warnings >= 3;
              const canBonus = commendations >= 3;
              const canFire = warnings >= 6;

              return (
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

                  <div className="employee-meta">
                    <span>Salary: ${salary.toLocaleString()}</span>
                    <span>Warnings: {warnings}</span>
                    <span>Commendations: {commendations}</span>
                    {emp.fired && <span className="badge bad">Fired</span>}
                  </div>

                  <div className="employee-actions">
                    <button className="btn" onClick={() => onSetRole(emp.id, "chef")}>
                      Set Chef
                    </button>
                    <button className="btn" onClick={() => onSetRole(emp.id, "delivery")}>
                      Set Delivery
                    </button>
                  </div>

                  {!emp.fired && (
                    <div className="employee-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => onDemote(emp)}
                        disabled={!canDemote}
                        title={canDemote ? "Demote this employee" : "Needs at least 3 warnings"}
                      >
                        Demote
                      </button>

                      <button
                        className="btn btn-sm"
                        onClick={() => onBonus(emp)}
                        disabled={!canBonus}
                        title={canBonus ? "Give bonus" : "Needs at least 3 commendations"}
                      >
                        Give Bonus
                      </button>

                      <button
                        className="btn btn-sm ghost"
                        onClick={() => onFire(emp)}
                        disabled={!canFire}
                        title={canFire ? "Fire this employee" : "Need at least 6 warnings to fire"}
                      >
                        Fire
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}