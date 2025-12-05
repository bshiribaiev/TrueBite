import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout, addDeposit} = useAuth();
  const nav = useNavigate();

  if (!user) return (
    <div className="panel">
      <h2 className="h2">You’re not logged in.</h2>
      <button className="btn" onClick={() => nav("/login")}>Go to Login</button>
    </div>
  );

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
        <button className="btn ghost" onClick={() => { logout(); nav("/"); }}>Logout</button>
      </div>
    </div>
  );
}
