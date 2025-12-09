// src/context/CartContext.tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "../services/orderService";

interface CartContextType {
  items: CartItem[];
  addItem: (item: { id: string; name: string; price: number; image?: string }) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem: CartContextType["addItem"] = (item) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateItemQuantity: CartContextType["updateItemQuantity"] = (
    id,
    quantity
  ) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item
        )
        // if quantity hits 0, remove the item from cart
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem: CartContextType["removeItem"] = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateItemQuantity, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
