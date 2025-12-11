import { Suspense, lazy } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import "./styles.css";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";

const Home = lazy(() => import("./pages/Home"));
const Menu = lazy(() => import("./pages/Menu"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Forum = lazy(() => import("./pages/Forum"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ChefDashboard = lazy(() => import("./pages/ChefDashboard"));
const DeliveryDashboard = lazy(() => import("./pages/DeliveryDashboard"));

export default function App() {
  const { user, loading, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();

  // Calculate total items in cart
  const cartCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Determine what role to display
  const getRoleDisplay = () => {
    if (loading) return null;
    if (!user) return { label: "Visitor", color: "#6b7280" };
    
    switch (user.role) {
      case "manager":
        return { label: "Manager", color: "#8b5cf6" };
      case "chef":
        return { label: "Chef", color: "#f59e0b" };
      case "delivery":
        return { label: "Delivery", color: "#3b82f6" };
      case "vip":
        return { label: "VIP", color: "#eab308" };
      case "registered":
        return { label: "Customer", color: "#10b981" };
      default:
        return { label: "Customer", color: "#10b981" };
    }
  };

  const roleInfo = getRoleDisplay();

  // Check if user is a customer (can see cart)
  const isCustomer = !user || user.role === "registered" || user.role === "vip" || user.role === "customer";

  return (
    <div>
      <header className="topbar">
        <div className="topbar-left">
          <NavLink to="/" className="brand">
            🍽️ TrueBite
          </NavLink>
          {roleInfo && (
            <span 
              className="role-badge"
              style={{ backgroundColor: roleInfo.color }}
            >
              {roleInfo.label}
            </span>
          )}
        </div>

        <nav className="nav">
          {/* Always visible */}
          <NavLink to="/" className="navlink">
            Home
          </NavLink>
          <NavLink to="/menu" className="navlink">
            Menu
          </NavLink>

          {/* Show Chat only for visitors and customers */}
          {(!user || user.role === "registered" || user.role === "vip" || user.role === "customer") && (
            <NavLink to="/chat" className="navlink">
              Chat
            </NavLink>
          )}

          {/* Not logged in - show Login */}
          {!user && (
            <NavLink to="/login" className="navlink">
              Login
            </NavLink>
          )}

          {/* Logged in users */}
          {user && (
            <>
              {/* Customers see Dashboard, Checkout (Cart), Forum */}
              {(user.role === "registered" || user.role === "vip" || user.role === "customer") && (
                <>
                  <NavLink to="/dashboard" className="navlink">
                    Dashboard
                  </NavLink>
                  <NavLink to="/checkout" className="navlink cart-navlink">
                    Cart
                    {cartCount > 0 && (
                      <span className="cart-badge">{cartCount}</span>
                    )}
                  </NavLink>
                  <NavLink to="/forum" className="navlink">
                    Forum
                  </NavLink>
                </>
              )}

              {/* Manager sees Manager Dashboard */}
              {user.role === "manager" && (
                <NavLink to="/manager" className="navlink">
                  Dashboard
                </NavLink>
              )}

              {/* Chef sees Chef Dashboard */}
              {user.role === "chef" && (
                <NavLink to="/chef" className="navlink">
                  Dashboard
                </NavLink>
              )}

              {/* Delivery sees Delivery Dashboard */}
              {user.role === "delivery" && (
                <NavLink to="/delivery" className="navlink">
                  Dashboard
                </NavLink>
              )}

              {/* User name */}
              <span className="nav-user">
                {user.name}
              </span>

              {/* Logout button for ALL logged-in users */}
              <button 
                className="nav-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="container">
        <Suspense fallback={<div className="loading-page">Loading…</div>}>
          <Routes>
            <Route
              path="/"
              element={
                <ErrorBoundary>
                  <Home />
                </ErrorBoundary>
              }
            />
            <Route
              path="/menu"
              element={
                <ErrorBoundary>
                  <Menu />
                </ErrorBoundary>
              }
            />
            <Route
              path="/login"
              element={
                <ErrorBoundary>
                  <Login />
                </ErrorBoundary>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              }
            />
            <Route
              path="/chat"
              element={
                <ErrorBoundary>
                  <Chat />
                </ErrorBoundary>
              }
            />
            <Route
              path="/checkout"
              element={
                <ErrorBoundary>
                  <Checkout />
                </ErrorBoundary>
              }
            />
            <Route
              path="/forum"
              element={
                <ErrorBoundary>
                  <Forum />
                </ErrorBoundary>
              }
            />

            {/* Role-specific dashboards */}
            <Route
              path="/manager"
              element={
                <ErrorBoundary>
                  <ManagerDashboard />
                </ErrorBoundary>
              }
            />
            <Route
              path="/chef"
              element={
                <ErrorBoundary>
                  <ChefDashboard />
                </ErrorBoundary>
              }
            />
            <Route
              path="/delivery"
              element={
                <ErrorBoundary>
                  <DeliveryDashboard />
                </ErrorBoundary>
              }
            />

            <Route path="*" element={<h2>404 – Page Not Found</h2>} />
          </Routes>
        </Suspense>
      </main>

      {/* Cart badge styles */}
      <style>{`
        .cart-navlink {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .cart-badge {
          position: absolute;
          top: -8px;
          right: -12px;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 999px;
          min-width: 18px;
          text-align: center;
          line-height: 1.2;
        }
      `}</style>
    </div>
  );
}