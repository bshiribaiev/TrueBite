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
        <h2 className="h2">You're not logged in.</h2>
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

  // ✅ CHANGED: Calculate VIP discount
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  const isVIP = user.role === "vip";
  const discount = isVIP ? subtotal * 0.05 : 0;
  const total = subtotal - discount;

  const handlePlaceOrder = async () => {
    if (!user) return;

    // ✅ CHANGED: Use calculated total (with discount)
    if (user.deposit < total) {
      addWarning();
      alert(
        "Insufficient deposit — please add more funds on your Dashboard. A warning has been added."
      );
      return;
    }

    try {
      const orderId = await createOrder(user.id, user.name, items);
      deductDeposit(total);
      clearCart();
      
      // ✅ CHANGED: Show discount in success message
      const message = isVIP 
        ? `Order placed! Your order ID is ${orderId}.\n🎉 VIP Discount Applied: $${discount.toFixed(2)} saved!`
        : `Order placed! Your order ID is ${orderId}.`;
      
      alert(message);
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

      {/* ✅ NEW: VIP Badge */}
      {isVIP && (
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1rem",
          textAlign: "center",
          fontWeight: "bold"
        }}>
          👑 VIP Member - 5% Discount Applied!
        </div>
      )}

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

      {/* ✅ CHANGED: Show discount breakdown */}
      <div className="stats" style={{ marginTop: "1rem" }}>
        <div className="stat">
          Subtotal: <b>${subtotal.toFixed(2)}</b>
        </div>
        {isVIP && discount > 0 && (
          <div className="stat" style={{ color: "#059669" }}>
            VIP Discount (5%): <b>-${discount.toFixed(2)}</b>
          </div>
        )}
        <div className="stat" style={{ 
          fontSize: "1.25rem", 
          borderTop: "2px solid #e5e7eb", 
          paddingTop: "0.5rem" 
        }}>
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