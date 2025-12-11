// src/components/DishCard.tsx

interface DishCardProps {
  dish: {
    id: string;
    name: string;
    price?: number;
    img?: string;
    image?: string;
    rating?: number;
    averageRating?: number;
  };
  onOrder?: (id: string) => void;
  buttonText?: string;
}

export default function DishCard({ dish, onOrder, buttonText = "Order" }: DishCardProps) {
  // Handle both 'img' and 'image' properties
  const imageUrl = dish.img || dish.image || "/placeholder-dish.jpg";
  
  // Handle both 'rating' (from Menu/mock) and 'averageRating' (from Home Firebase)
  const rating = dish.rating ?? dish.averageRating ?? 0;
  
  // Safely handle price
  const price = dish.price ?? 0;

  // Format rating display - show "New" if no rating yet
  const ratingDisplay = rating > 0 ? `⭐ ${rating.toFixed(1)}` : "✨ New";

  // Check if button shows "Added" state
  const isAdded = buttonText?.includes("Added");

  return (
    <div className="card">
      <img src={imageUrl} alt={dish.name} className="card-img" />
      <div className="card-body">
        <div className="card-title">{dish.name}</div>
        <div className="card-sub">
          ${price.toFixed(2)} • {ratingDisplay}
        </div>
        {onOrder && (
          <button 
            className="btn" 
            onClick={() => onOrder(dish.id)}
            style={isAdded ? {
              backgroundColor: "#22c55e",
              cursor: "default"
            } : undefined}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}