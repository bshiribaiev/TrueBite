import Section from "../components/Section";
import DishCard from "../components/DishCard";
import { popular, topRated } from "../mock/data";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const nav = useNavigate();

  return (
    <>
      <h1 className="h1">Welcome to TrueBite</h1>
      <p className="muted">Discover top-rated dishes, then sign in to order.</p>

      <Section title="Most Popular">
        <div className="grid">
          {popular.map(d => (
            <DishCard key={d.id} dish={d} onOrder={() => nav("/login")} />
          ))}
        </div>
      </Section>

      <Section title="Top Rated">
        <div className="grid">
          {topRated.map(d => (
            <DishCard key={d.id} dish={d} onOrder={() => nav("/login")} />
          ))}
        </div>
      </Section>
    </>
  );
}
