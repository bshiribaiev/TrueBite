// src/pages/Login.tsx
import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Role } from "../types";

export default function Login() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("registered");
  const { login, getDashboardRouteForRole } = useAuth();
  const nav = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const chosenName = name || "Customer";
    login(chosenName, role);
    const dest = getDashboardRouteForRole(role);
    nav(dest);
  };

  return (
    <div className="panel">
      <h1 className="h1">Login / Register</h1>
      <form onSubmit={onSubmit} className="form">
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
          Role
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="visitor">Visitor</option>
            <option value="registered">Registered</option>
            <option value="vip">VIP</option>
            <option value="manager">Manager</option>
            <option value="chef">Chef</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>

        <button className="btn" type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}
