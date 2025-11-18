import { Suspense, lazy } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import "./styles.css";
import ErrorBoundary from "./ErrorBoundary";

const Home = lazy(() => import("./pages/Home"));
const Menu = lazy(() => import("./pages/Menu"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Chat = lazy(() => import("./pages/Chat"));

// NEW:
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ChefDashboard = lazy(() => import("./pages/ChefDashboard"));
const DeliveryDashboard = lazy(() => import("./pages/DeliveryDashboard"));

export default function App() {
  return (
    <div>
      <header className="topbar">
        <NavLink to="/" className="brand">
          TrueBite
        </NavLink>
        <nav className="nav">
          <NavLink to="/" className="navlink">
            Home
          </NavLink>
          <NavLink to="/menu" className="navlink">
            Menu
          </NavLink>
          <NavLink to="/login" className="navlink">
            Login
          </NavLink>
          <NavLink to="/dashboard" className="navlink">
            Dashboard
          </NavLink>
          <NavLink to="/chat" className="navlink">
            Chat
          </NavLink>
          {/* Optional: quick links for demos in your report */}
          <NavLink to="/manager" className="navlink">
            Manager
          </NavLink>
          <NavLink to="/chef" className="navlink">
            Chef
          </NavLink>
          <NavLink to="/delivery" className="navlink">
            Delivery
          </NavLink>
        </nav>
      </header>

      <main className="container">
        <Suspense fallback={<p>Loading…</p>}>
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

            {/* NEW ROLE DASHBOARDS */}
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
    </div>
  );
}
