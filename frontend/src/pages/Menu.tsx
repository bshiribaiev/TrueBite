// src/pages/Menu.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";

import DishCard from "../components/DishCard";
// ❌ remove this: import { dishes } from "../mock/data";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { db } from "../firebaseConfig";
import type { Dish } from "../types";

export default function Menu() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { addItem } = useCart();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load dishes from Firestore
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const q = query(
          collection(db, "dishes"),
          where("available", "==", true)
        );
        const snap = await getDocs(q);

        const data: Dish[] = snap.docs.map((docSnap) => {
          const d = docSnap.data() as any;
          return {
            id: docSnap.id,
            name: d.name ?? "Unnamed dish",
            description: d.description ?? "",
            price: d.price ?? 0,
            img: d.img ?? "",
            available: d.available ?? true,
            rating: d.rating ?? 0,
          };
        });

        setDishes(data);
      } catch (e) {
        console.error(e);
        setError("Failed to load menu.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleOrder = (id: string) => {
    if (!user) return nav("/login");

    const dish = dishes.find((d) => d.id === id);
    if (!dish) {
      alert("Dish not found.");
      return;
    }

    addItem({
      id: dish.id,
      name: dish.name,
      price: dish.price ?? 0,
    });

    nav("/checkout");
  };

  return (
    <>
      <h1 className="h1">Menu</h1>
      <p className="muted">
        {user ? `Welcome, ${user.name}!` : "Log in to place an order."}
      </p>

      {loading && <p>Loading menu…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="grid">
          {dishes.length === 0 ? (
            <p>No dishes available yet.</p>
          ) : (
            dishes.map((d) => (
              <DishCard key={d.id} dish={d} onOrder={handleOrder} />
            ))
          )}
        </div>
      )}
    </>
  );
}
