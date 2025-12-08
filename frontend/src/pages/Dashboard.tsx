// src/pages/Dashboard.tsx
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Order } from "../types";
import { getOrdersForUser } from "../services/orderService";
import {
  createComplaint,
  submitRating,
} from "../services/complaintService";

export default function Dashboard() {
  const { user, logout, addDeposit } = useAuth();
  const nav = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");


  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoadingOrders(true);
      setOrdersError("");
      try {
        const data = await getOrdersForUser(user.id);
        setOrders(data);
      } catch (e) {
        console.error(e);
        setOrdersError("Failed to load your orders.");
      } finally {
        setLoadingOrders(false);
      }
    };

    load();
  }, [user]);

  if (!user)
    return (
      <div className="panel">
        <h2 className="h2">You’re not logged in.</h2>
        <button className="btn" onClick={() => nav("/login")}>
          Go to Login
        </button>
      </div>
    );

  const statusLabel = (status: Order["status"]) =>
    status.replace(/_/g, " ");

  // ⭐ Dish rating submit
  const handleSubmitRating = async (
    e: FormEvent<HTMLFormElement>,
    order: Order
  ) => {
    e.preventDefault();
    if (!user) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    const dishId = (formData.get("dishId") as string) || "";
    const scoreStr = (formData.get("score") as string) || "";
    const comment = (formData.get("comment") as string) || "";

    if (!dishId) {
      alert("Please select a dish to rate.");
      return;
    }

    const score = Number(scoreStr);
    if (!scoreStr || isNaN(score) || score < 1 || score > 5) {
      alert("Please choose a rating between 1 and 5.");
      return;
    }

    const dish = order.items.find((it) => it.id === dishId);
    const dishName = dish?.dishName ?? "Dish";

    try {
      await submitRating({
        orderId: order.id,
        dishId: dishId,
        dishName,
        customerId: user.id,
        customerName: user.name,
        score,
        comment,
      });
      alert("Thank you! Your rating has been recorded.");
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to submit rating. Please try again.");
    }
  };

  // 😠 / 😊 Complaint / compliment about people (chef / delivery)
 const handleSubmitFeedback = async (
  e: FormEvent<HTMLFormElement>,
  order: Order
) => {
  e.preventDefault();
  if (!user) return;

  const form = e.currentTarget;
  const formData = new FormData(form);

  const kindRaw = (formData.get("kind") as string) || "COMPLAINT";
  const targetRaw = (formData.get("target") as string) || "chef";
  const description = ((formData.get("description") as string) || "").trim();

  if (!description) {
    alert("Please enter a description.");
    return;
  }

  if (kindRaw !== "COMPLAINT" && kindRaw !== "COMPLIMENT") {
    alert("Invalid feedback type.");
    return;
  }

  if (targetRaw !== "chef" && targetRaw !== "delivery") {
    alert("Invalid target.");
    return;
  }

  // 👇 use real IDs + names from the order
  let targetId: string | null = null;
  let targetName = "";

  if (targetRaw === "chef") {
    targetId = order.chefId ?? null;
    targetName = order.chefName ?? "Unknown Chef";
  } else {
    // delivery
    // delivery
    targetId = order.deliveryPersonId ?? null;
    targetName = order.deliveryPersonName ?? "Unknown Delivery"
  }

  if (!targetId) {
    alert("No target user found for this order (missing chef/delivery on the order).");
    return;
  }

  try {
    await createComplaint({
      orderId: order.id,
      customerId: user.id,
      customerName: user.name,
      targetType: targetRaw as "chef" | "delivery",
      targetId,
      targetName,
      description,
      kind: kindRaw as "COMPLAINT" | "COMPLIMENT",
    });
    alert("Your feedback has been sent to the manager.");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("Failed to submit feedback.");
  }
};


  return (
    <div className="panel">
      <h1 className="h1">Dashboard</h1>
      <p className="muted">Role: {user.role.toUpperCase()}</p>

      {/* Balance & warnings */}
      <div className="stats">
        <div className="stat">
          Deposit: <b>${user.deposit.toFixed(2)}</b>
        </div>
        <div className={`stat ${user.warnings ? "bad" : ""}`}>
          Warnings: <b>{user.warnings}</b>
        </div>
      </div>

      <div className="actions">
        <button className="btn" onClick={() => addDeposit(25)}>
          Add $25 Deposit
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            logout();
            nav("/");
          }}
        >
          Logout
        </button>
      </div>

      {/* My Orders */}
      <hr style={{ margin: "1.5rem 0" }} />
      <h2 className="h2">My Orders</h2>

      {loadingOrders && <p>Loading your orders…</p>}
      {ordersError && <p className="error">{ordersError}</p>}

      {!loadingOrders && !ordersError && (
        <div className="orders-list">
          {orders.length === 0 ? (
            <p>You have no orders yet.</p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <span className="order-id">Order #{order.id}</span>
                  <span
                    className={`status-badge ${order.status.toLowerCase()}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className="order-details">
                  <div className="detail-row">
                    <span className="label">Placed:</span>
                    <span>
                      {new Date(
                        order.createdAt as any
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Items:</span>
                    <span>
                      {Array.isArray(order.items)
                        ? order.items.length
                        : 0}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Total:</span>
                    <span>
                      ${((order.totalPrice ?? 0) as number).toFixed(2)}
                    </span>
                  </div>
                </div>

                {Array.isArray(order.items) &&
                  order.items.length > 0 && (
                    <div className="order-items">
                      {order.items.map((item) => (
                        <div key={item.id} className="detail-row">
                          <span className="label">•</span>
                          <span>
                            {item.quantity}x {item.dishName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Feedback area */}
                <div className="order-feedback">
                  {/* Dish rating form */}
                  <form
                    className="feedback-form"
                    onSubmit={(e) => handleSubmitRating(e, order)}
                  >
                    <h4 className="h4">Rate a dish</h4>

                    <div className="feedback-row">
                      <label>
                        Dish:
                        <select
                          name="dishId"
                          className="input"
                          defaultValue=""
                          disabled={order.status !== "DELIVERED"}
                        >
                          <option value="" disabled>
                            Select dish
                          </option>
                          {order.items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.dishName}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="feedback-row">
                      <label>
                        Rating:
                        <select
                          name="score"
                          defaultValue=""
                          disabled={order.status !== "DELIVERED"}
                          className="input"
                        >
                          <option value="" disabled>
                            Select rating
                          </option>
                          <option value="5">
                            ⭐ 5 - Excellent
                          </option>
                          <option value="4">
                            ⭐ 4 - Good
                          </option>
                          <option value="3">
                            ⭐ 3 - OK
                          </option>
                          <option value="2">
                            ⭐ 2 - Poor
                          </option>
                          <option value="1">
                            ⭐ 1 - Terrible
                          </option>
                        </select>
                      </label>
                    </div>

                    <div className="feedback-row">
                      <input
                        name="comment"
                        className="input"
                        placeholder="Optional comment about this dish"
                        disabled={order.status !== "DELIVERED"}
                      />
                    </div>

                    <button
                      className="btn btn-sm"
                      type="submit"
                      disabled={order.status !== "DELIVERED"}
                    >
                      Submit Dish Rating
                    </button>
                  </form>

                  {/* Complaint / compliment form (about chef/delivery) */}
                  <form
                    className="feedback-form"
                    onSubmit={(e) => handleSubmitFeedback(e, order)}
                  >
                    <h4 className="h4">Complaint / Compliment</h4>
                    <div className="feedback-row">
                      <label>
                        Type:
                        <select
                          name="kind"
                          className="input"
                          defaultValue="COMPLAINT"
                        >
                          <option value="COMPLAINT">
                            Complaint
                          </option>
                          <option value="COMPLIMENT">
                            Compliment
                          </option>
                        </select>
                      </label>
                    </div>
                    <div className="feedback-row">
                      <label>
                        About:
                        <select
                          name="target"
                          className="input"
                          defaultValue="chef"
                        >
                          <option value="chef">Chef</option>
                          <option value="delivery">
                            Delivery
                          </option>
                        </select>
                      </label>
                    </div>
                    <div className="feedback-row">
                      <textarea
                        name="description"
                        className="input"
                        rows={2}
                        placeholder="Describe your complaint/compliment"
                      />
                    </div>
                    <button
                      className="btn btn-sm"
                      type="submit"
                    >
                      Submit Feedback
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
