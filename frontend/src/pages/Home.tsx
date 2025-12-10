import { useEffect, useState } from "react";
import Section from "../components/Section";
import DishCard from "../components/DishCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import type { Dish } from "../types";

interface DishWithStats extends Dish {
  orderCount: number;
}

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [popular, setPopular] = useState<DishWithStats[]>([]);
  const [topRated, setTopRated] = useState<DishWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDishStats = async () => {
      try {
        // Step 1: Fetch all available dishes from dishes collection (same as Menu.tsx)
        const dishQuery = query(
          collection(db, "dishes"),
          where("available", "==", true)
        );
        const dishSnapshot = await getDocs(dishQuery);

        const dishesMap = new Map<string, DishWithStats>();

        dishSnapshot.docs.forEach((docSnap) => {
          const d = docSnap.data() as any;
          dishesMap.set(docSnap.id, {
            id: docSnap.id,
            name: d.name ?? "Unnamed Dish",
            description: d.description ?? "",
            price: d.price ?? 0,
            img: d.img ?? "/placeholder-dish.jpg",
            available: d.available ?? true,
            rating: d.rating ?? 0,
            orderCount: 0,
          });
        });

        // Step 2: Fetch orders to count popularity
        const ordersSnapshot = await getDocs(collection(db, "orders"));

        ordersSnapshot.docs.forEach((doc) => {
          const order = doc.data();

          order.items?.forEach((item: any) => {
            const dishId = item.dishId || item.id;

            // Only count if this dish exists in our dishes collection
            if (dishesMap.has(dishId)) {
              const dish = dishesMap.get(dishId)!;
              dish.orderCount += item.quantity || 1;
            }
          });
        });

        const allDishes = Array.from(dishesMap.values());

        // Get top 6 most popular (by order count, must have at least 1 order)
        const mostPopular = [...allDishes]
          .filter((d) => d.orderCount > 0)
          .sort((a, b) => b.orderCount - a.orderCount)
          .slice(0, 6);

        // Get top 6 highest rated (must have rating > 0)
        const highestRated = [...allDishes]
          .filter((d) => (d.rating ?? 0) > 0)
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, 6);

        setPopular(mostPopular);
        setTopRated(highestRated);
      } catch (error) {
        console.error("Error fetching dish stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDishStats();
  }, []);

  const handleOrder = (id: string) => {
    if (!user) {
      nav("/login");
      return;
    }

    const dish = popular.find((d) => d.id === id) || topRated.find((d) => d.id === id);
    if (!dish) return;

    addItem({
      id: dish.id,
      name: dish.name,
      price: dish.price ?? 0,
      image: dish.img,
    });

    nav("/checkout");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p>Loading dishes...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="h1">Welcome to TrueBite</h1>
      <p className="muted">Discover top-rated dishes, then sign in to order.</p>

      <Section title="Most Popular">
        {popular.length > 0 ? (
          <div className="grid">
            {popular.map((d) => (
              <DishCard key={d.id} dish={d} onOrder={handleOrder} />
            ))}
          </div>
        ) : (
          <p className="muted">No orders yet. Be the first to order!</p>
        )}
      </Section>

      <Section title="Top Rated">
        {topRated.length > 0 ? (
          <div className="grid">
            {topRated.map((d) => (
              <DishCard key={d.id} dish={d} onOrder={handleOrder} />
            ))}
          </div>
        ) : (
          <p className="muted">No rated dishes yet. Order and leave a review!</p>
        )}
      </Section>
    </>
  );
}