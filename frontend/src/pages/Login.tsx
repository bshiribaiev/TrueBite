// src/pages/Login.tsx
import { type FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

type RegisterType = "customer" | "employee" | "manager";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerType, setRegisterType] = useState<RegisterType>("customer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, loading, login, register, logout, getDashboardRouteForRole } =
    useAuth();
  const nav = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (mode === "register") {
        const displayName = name || "Customer";
        const role = registerType === "manager" ? "manager" : "registered";

        await register(displayName, email, password, role, registerType);
        await login(email, password);

        const dest =
          registerType === "manager"
            ? getDashboardRouteForRole("manager")
            : getDashboardRouteForRole("registered");
        nav(dest);
      } else {
        await login(email, password);
        // after login, use user role next time we render
        nav("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Firebase: ${err.message || "Authentication failed"}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 1) Still checking auth state
  if (loading) {
    return (
      <div className="panel">
        <h1 className="h1">Login / Register</h1>
        <p>Checking session…</p>
      </div>
    );
  }

  // 2) Already logged in – show prompt instead of form
  if (user) {
    const goToDashboard = () => {
      const dest = getDashboardRouteForRole(user.role);
      nav(dest);
    };

    const handleLogout = async () => {
      await logout();
      nav("/"); // back to home or wherever you want
    };

    return (
      <div className="panel">
        <h1 className="h1">Already logged in</h1>
        <p>
          You are currently logged in as <strong>{user.name}</strong> (
          {user.role}).
        </p>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
          <button className="btn" type="button" onClick={goToDashboard}>
            Go to dashboard
          </button>
          <button
            className="btn"
            type="button"
            onClick={handleLogout}
            style={{ backgroundColor: "#aaa" }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // 3) Not logged in – show login/register form
  return (
    <div className="panel">
      <h1 className="h1">Login / Register</h1>

      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className="btn"
          disabled={mode === "login"}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          type="button"
          className="btn"
          disabled={mode === "register"}
          onClick={() => setMode("register")}
          style={{ marginLeft: "0.5rem" }}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="form">
        {mode === "register" && (
          <>
            <label>
              Name
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>

            <label>
              Account type
              <select
                className="input"
                value={registerType}
                onChange={(e) =>
                  setRegisterType(e.target.value as RegisterType)
                }
              >
                <option value="customer">Customer</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </label>
          </>
        )}

        <label>
          Email
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
        </label>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting
            ? mode === "login"
              ? "Logging in…"
              : "Registering…"
            : mode === "login"
            ? "Login"
            : "Register"}
        </button>
      </form>
    </div>
  );
}
