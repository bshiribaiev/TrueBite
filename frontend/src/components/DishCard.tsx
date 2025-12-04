import type { Dish } from "../mock/data";

export default function DishCard({ dish, onOrder }: { dish: Dish; onOrder?: (id: string) => void }) {
  return (
    <div className="card">
      <img src={dish.img} alt={dish.name} className="card-img" />
      <div className="card-body">
        <div className="card-title">{dish.name}</div>
        <div className="card-sub">${dish.price.toFixed(2)} • ⭐ {dish.rating.toFixed(1)}</div>
        {onOrder && (
          <button className="btn" onClick={() => onOrder(dish.id)}>
            Order
          </button>
        )}
      </div>
    </div>
  );
}
