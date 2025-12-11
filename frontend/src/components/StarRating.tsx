// src/components/StarRating.tsx
import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function StarRating({ 
  value, 
  onChange, 
  disabled = false,
  size = "md" 
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizes = {
    sm: { star: "20px", gap: "2px" },
    md: { star: "28px", gap: "4px" },
    lg: { star: "36px", gap: "6px" },
  };

  const currentSize = sizes[size];
  const displayValue = hoverValue || value;

  return (
    <div 
      style={{ 
        display: "inline-flex", 
        gap: currentSize.gap,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseLeave={() => !disabled && setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !disabled && onChange(star)}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          style={{
            fontSize: currentSize.star,
            color: star <= displayValue ? "#fbbf24" : "#d1d5db",
            transition: "color 0.15s ease, transform 0.15s ease",
            transform: star <= displayValue ? "scale(1.1)" : "scale(1)",
            userSelect: "none",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}