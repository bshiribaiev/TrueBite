// frontend/src/pages/Checkout.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createOrder, getOrdersForUser } from "../services/orderService";
import { useState, useEffect } from "react";
import "../styles.css";

export default function Checkout() {
  const { user, addWarning, deductDeposit } = useAuth();
  const { items, clearCart, updateItemQuantity, removeItem } = useCart();
  const nav = useNavigate();
  
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch user's order count on mount
  useEffect(() => {
    if (user) {
      getOrdersForUser(user.id).then((orders) => {
        setOrderCount(orders.length);
        setLoading(false);
      });
    }
  }, [user]);

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

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const isVIP = user.role === "vip";
  const discount = isVIP ? subtotal * 0.05 : 0;
  
  // Calculate delivery fee (FREE every 3rd order for VIP)
  const deliveryFee = 5.00;
  const nextOrderNumber = orderCount + 1;
  const isFreeDelivery = isVIP && nextOrderNumber % 3 === 0;
  const finalDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  
  const total = subtotal - discount + finalDeliveryFee;

  const handlePlaceOrder = async () => {
    if (!user) return;

    if ((user.deposit ?? 0) < total) {
      addWarning();
      alert(
        "Insufficient deposit — please add more funds on your Dashboard. A warning has been added."
      );
      return;
    }

    try {

      // Store VIP status BEFORE order
      const wasVIP = isVIP; 

      const orderId = await createOrder(user.id, user.name, items);
      deductDeposit(total);
      clearCart();

      const { getUserProfile } = await import("../services/userService");
      const updatedUser = await getUserProfile(user.id);
      const isNowVIP = updatedUser?.role === "vip";

      let message = `Order placed! Your order ID is ${orderId}.`;
      if (isVIP) {
        message += `\n🎉 VIP Discount Applied: $${discount.toFixed(2)} saved!`;
      }
      if (isFreeDelivery) {
        message += `\n🚚 FREE DELIVERY on your ${nextOrderNumber}${getOrdinalSuffix(nextOrderNumber)} order!`;
      }

    // ✅ IF JUST BECAME VIP, SHOW SPECIAL MESSAGE AND RELOAD
    if (!wasVIP && isNowVIP) {
      message += `\n\n🎊 CONGRATULATIONS! You've been upgraded to VIP status! You now get 5% discounts and free delivery every 3rd order!`;
      alert(message);
      window.location.reload(); // Reload to show VIP status
      return;
    }

      alert(message);
      nav("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to place order. Please try again.");
    }
  };

  // Helper function for ordinal suffix
  function getOrdinalSuffix(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  if (loading) {
    return <div className="panel"><p>Loading...</p></div>;
  }

  return (
    <div className="cart-layout">
      {/* LEFT: items */}
      <div className="cart-items">
        <h1 className="h1">Your Cart</h1>
        <p className="muted">Review your items and adjust quantities.</p>

        {isVIP && (
          <div
            style={{
              background:
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "1rem",
              borderRadius: "8px",
              margin: "1rem 0",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            👑 VIP Member - 5% Discount Applied!
          </div>
        )}

        {/* FREE DELIVERY BANNER */}
        {isFreeDelivery && (
          <div
            style={{
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              color: "white",
              padding: "1.25rem",
              borderRadius: "8px",
              margin: "1rem 0",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "1.1rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            🎉 <strong>FREE DELIVERY!</strong> 🎉
            <div style={{ fontSize: "0.9rem", marginTop: "0.5rem", opacity: 0.95 }}>
              This is your {nextOrderNumber}{getOrdinalSuffix(nextOrderNumber)} order - You save $5.00!
            </div>
          </div>
        )}

        <div className="orders-list">
          {items.map((item) => (
            <div key={item.id} className="order-card">
              <div className="cart-item">
                {/* image */}
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-img"
                  />
                )}

                <div className="cart-item-body">
                  <div className="order-header">
                    <span className="order-id">{item.name}</span>
                    <button
                      type="button"
                      className="link-danger"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="order-details">
                    <div className="detail-row">
                      <span className="label">Price:</span>
                      <span>${item.price.toFixed(2)}</span>
                    </div>

                    <div className="detail-row">
                      <span className="label">Quantity:</span>
                      <div className="qty-controls">
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item.id, item.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="detail-row">
                      <span className="label">Subtotal:</span>
                      <span>
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: summary */}
      <div className="cart-summary">
        <div className="cart-summary-card">
          <h2 className="h2">Order Summary</h2>

          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {isVIP && discount > 0 && (
              <div className="summary-row" style={{ color: '#667eea' }}>
                <span>VIP Discount (5%)</span>
                <span>- ${discount.toFixed(2)}</span>
              </div>
            )}
            
            {/* DELIVERY FEE ROW */}
            <div className="summary-row">
              <span>Delivery Fee</span>
              {isFreeDelivery ? (
                <span style={{ color: '#38ef7d', fontWeight: 'bold' }}>
                  <del style={{ color: '#999', marginRight: '0.5rem' }}>$5.00</del>
                  FREE!
                </span>
              ) : (
                <span>${deliveryFee.toFixed(2)}</span>
              )}
            </div>
            
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button className="btn btn-block" onClick={handlePlaceOrder}>
            Place Order
          </button>
          <button
            className="btn ghost btn-block"
            onClick={() => nav("/menu")}
          >
            Add more items
          </button>
          <button
            className="link-danger"
            type="button"
            onClick={clearCart}
            style={{ marginTop: "0.75rem" }}
          >
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  );
}