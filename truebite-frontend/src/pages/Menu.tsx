import DishCard from "../components/DishCard";
import { dishes } from "../mock/data";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Menu() {
  const { user } = useAuth();
  const nav = useNavigate();

  const handleOrder = (id: string) => {
    if (!user) return nav("/login");
    alert(`(Mock) Added dish ${id} to cart — proceed to Dashboard to checkout.`);
  };

  return (
    <>
      <h1 className="h1">Menu</h1>
      <p className="muted">{user ? `Welcome, ${user.name}!` : "Log in to place an order."}</p>
      <div className="grid">
        {dishes.map(d => <DishCard key={d.id} dish={d} onOrder={handleOrder} />)}
      </div>
    </>
  );
}
