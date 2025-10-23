import { FormEvent, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"registered"|"vip">("registered");
  const { login } = useAuth();
  const nav = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(name || "Customer", role);
    nav("/dashboard");
  };

  return (
    <div className="panel">
      <h1 className="h1">Login / Register</h1>
      <form onSubmit={onSubmit} className="form">
        <label>
          Name
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label>
          Role
          <select className="input" value={role} onChange={e => setRole(e.target.value as any)}>
            <option value="registered">Registered</option>
            <option value="vip">VIP</option>
          </select>
        </label>
        <button className="btn" type="submit">Continue</button>
      </form>
    </div>
  );
}
