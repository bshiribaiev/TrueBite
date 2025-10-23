import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout, addDeposit, addWarning } = useAuth();
  const nav = useNavigate();

  if (!user) return (
    <div className="panel">
      <h2 className="h2">You’re not logged in.</h2>
      <button className="btn" onClick={() => nav("/login")}>Go to Login</button>
    </div>
  );

  const checkoutExample = () => {
    const total = 40; // pretend cart total
    if (user.deposit < total) {
      addWarning();
      alert("Insufficient deposit — warning added (mock).");
    } else {
      alert("Order placed (mock). Status: placed → cooking → out-for-delivery → delivered");
    }
  };

  return (
    <div className="panel">
      <h1 className="h1">Dashboard</h1>
      <p className="muted">Role: {user.role.toUpperCase()}</p>
      <div className="stats">
        <div className="stat">Deposit: <b>${user.deposit.toFixed(2)}</b></div>
        <div className={`stat ${user.warnings ? "bad" : ""}`}>Warnings: <b>{user.warnings}</b></div>
      </div>

      <div className="actions">
        <button className="btn" onClick={() => addDeposit(25)}>Add $25 Deposit</button>
        <button className="btn" onClick={checkoutExample}>Mock Checkout ($40)</button>
        <button className="btn ghost" onClick={() => { logout(); nav("/"); }}>Logout</button>
      </div>
    </div>
  );
}
