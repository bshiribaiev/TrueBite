import Section from "../components/Section";
import DishCard from "../components/DishCard";
import { popular, topRated } from "../mock/data";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  const handleOrder = (dish: any) => {
    if (!user) {
      nav("/login");
      return;
    }

    addItem({
      id: dish.id,
      name: dish.name,
      price: dish.price ?? 0,
      image: dish.img,        
    });

    nav("/checkout");
  };

  return (
    <>
      <h1 className="h1">Welcome to TrueBite</h1>
      <p className="muted">Discover top-rated dishes, then sign in to order.</p>

      <Section title="Most Popular">
        <div className="grid">
          {popular.map((d) => (
            <DishCard key={d.id} dish={d} onOrder={() => handleOrder(d)} />
          ))}
        </div>
      </Section>

      <Section title="Top Rated">
        <div className="grid">
          {topRated.map((d) => (
            <DishCard key={d.id} dish={d} onOrder={() => handleOrder(d)} />
          ))}
        </div>
      </Section>
    </>
  );
}
