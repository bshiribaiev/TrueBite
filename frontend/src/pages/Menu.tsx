// src/pages/Menu.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";

import DishCard from "../components/DishCard";
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
  
  // Search & Voice states
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  // Check if browser supports speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

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

  // Filter dishes based on search term
  const filteredDishes = dishes.filter((dish) => {
    const term = searchTerm.toLowerCase();
    return (
      dish.name.toLowerCase().includes(term) ||
      (dish.description && dish.description.toLowerCase().includes(term))
    );
  });

  // Voice search handler
  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice search is not supported in your browser. Try Chrome!");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        alert("Microphone access denied. Please allow microphone access to use voice search.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

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

      {/* Search Bar with Voice Search */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        marginBottom: "24px",
        maxWidth: "500px"
      }}>
        <div style={{ 
          flex: 1, 
          position: "relative",
          display: "flex",
          alignItems: "center"
        }}>
          <span style={{
            position: "absolute",
            left: "12px",
            color: "#9ca3af",
            fontSize: "18px"
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 12px 12px 40px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              fontSize: "16px",
              outline: "none",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: "18px",
                padding: "0",
              }}
            >
              ✕
            </button>
          )}
        </div>
        
        {voiceSupported && (
          <button
            onClick={startVoiceSearch}
            disabled={isListening}
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: isListening ? "#ef4444" : "#667eea",
              color: "white",
              fontSize: "18px",
              cursor: isListening ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: isListening ? "pulse 1s infinite" : "none",
            }}
            title="Voice Search"
          >
            🎤
            {isListening && <span style={{ fontSize: "14px" }}>Listening...</span>}
          </button>
        )}
      </div>

      {/* Show what was searched */}
      {searchTerm && (
        <p style={{ marginBottom: "16px", color: "#6b7280" }}>
          Showing results for: <strong>"{searchTerm}"</strong>
          {filteredDishes.length === 0 && " — No matches found"}
        </p>
      )}

      {loading && <p>Loading menu…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="grid">
          {filteredDishes.length === 0 && !searchTerm ? (
            <p>No dishes available yet.</p>
          ) : filteredDishes.length === 0 && searchTerm ? (
            <p>No dishes match your search. Try something else!</p>
          ) : (
            filteredDishes.map((d) => (
              <DishCard key={d.id} dish={d} onOrder={handleOrder} />
            ))
          )}
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}