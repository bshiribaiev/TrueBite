// src/pages/Checkout.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/orderService";

export default function Checkout() {
  const { user, addWarning, deductDeposit } = useAuth();
  const { items, clearCart } = useCart();
  const nav = useNavigate();

  if (!user) {
    return (
      <div className="panel">
        <h2 className="h2">You’re not logged in.</h2>
        <button className="btn" onClick={() => nav("/login")}>
          Go to Login
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="panel">
        <h1 className="h1">Checkout</h1>
        <p>Your cart is empty. Go to the Menu to add items.</p>
        <button className="btn" onClick={() => nav("/menu")}>
          Back to Menu
        </button>
      </div>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handlePlaceOrder = async () => {
  if (!user) return;

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // 1) Check deposit
  if (user.deposit < total) {
    addWarning();
    alert(
      "Insufficient deposit — please add more funds on your Dashboard. A warning has been added."
    );
    return;
  }

  try {
    // 2) Create Firestore order
    const orderId = await createOrder(user.id, user.name, items);

    // 3) Deduct balance locally
    deductDeposit(total);

    // 4) Clear cart & navigate
    clearCart();
    alert(`Order placed! Your order ID is ${orderId}.`);
    nav("/dashboard");
  } catch (err) {
    console.error(err);
    alert("Failed to place order. Please try again.");
  }
};



  return (
    <div className="panel">
      <h1 className="h1">Checkout</h1>
      <p className="muted">Review your items and place your order.</p>

      <div className="orders-list">
        {items.map((item) => (
          <div key={item.id} className="order-card">
            <div className="order-header">
              <span className="order-id">{item.name}</span>
            </div>
            <div className="order-details">
              <div className="detail-row">
                <span className="label">Price:</span>
                <span>${item.price.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Quantity:</span>
                <span>{item.quantity}</span>
              </div>
              <div className="detail-row">
                <span className="label">Subtotal:</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="stats" style={{ marginTop: "1rem" }}>
        <div className="stat">
          Total: <b>${total.toFixed(2)}</b>
        </div>
      </div>

      <div className="actions">
        <button className="btn" onClick={handlePlaceOrder}>
          Place Order
        </button>
        <button className="btn ghost" onClick={() => nav("/menu")}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
