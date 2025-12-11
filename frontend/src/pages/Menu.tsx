// src/pages/Menu.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";

import DishCard from "../components/DishCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { db } from "../firebaseConfig";
import { updateDish, createDish } from "../services/chefService";
import type { Dish } from "../types";

type UIDish = Dish & {
  chefId?: string | null;
  chefName?: string | null;
  vipOnly?: boolean;
};

export default function Menu() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { addItem } = useCart();

  const [dishes, setDishes] = useState<UIDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Voice states
  const [searchTerm, setSearchTerm] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  
  // Added to cart feedback
  const [addedDishId, setAddedDishId] = useState<string | null>(null);
  
  // Add Dish Modal state (for chefs)
  const [showDishModal, setShowDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState<UIDish | null>(null);

  // Check if user is a chef or manager
  const isChef = user?.role === "chef";
  const isManager = user?.role === "manager";
  const canManageDishes = isChef;
  const canSeeCreatedBy = isChef || isManager;

  // Check if browser supports speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

  // Load dishes from Firestore
  const loadDishes = async () => {
    setLoading(true);
    setError("");
    try {
      let dishQuery;
      if (isChef || isManager) {
        dishQuery = collection(db, "dishes");
      } else {
        dishQuery = query(
          collection(db, "dishes"),
          where("available", "==", true)
        );
      }

      const snap = await getDocs(dishQuery);

      const data: UIDish[] = snap.docs.map((docSnap) => {
        const d = docSnap.data() as any;
        return {
          id: docSnap.id,
          name: d.name ?? "Unnamed dish",
          description: d.description ?? "",
          price: d.price ?? 0,
          img: d.img ?? "",
          available: d.available ?? true,
          rating: d.rating ?? 0,
          vipOnly: d.vipOnly ?? false,
          chefId: d.chefId ?? d.createdByChefId ?? null,
          chefName: d.chefName ?? d.createdByChefName ?? null,
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

  useEffect(() => {
    loadDishes();
  }, [user]);

  // Filter dishes
  const filteredDishes = dishes.filter((dish) => {
    if (!isChef && !isManager && dish.vipOnly && user?.role !== "vip") {
      return false;
    }
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

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // Handle Add to Cart
  const handleAddToCart = (id: string) => {
    if (!user) return nav("/login");
    if (isChef || isManager) return;

    const dish = dishes.find((d) => d.id === id);
    if (!dish) return;

    addItem({
      id: dish.id,
      name: dish.name,
      price: dish.price ?? 0,
      image: dish.img
    });

    setAddedDishId(id);
    setTimeout(() => setAddedDishId(null), 2000);
  };

  // Toggle dish availability
  const handleToggleAvailability = async (dishId: string, available: boolean) => {
    try {
      await updateDish(dishId, { available });
      await loadDishes();
    } catch (err) {
      alert("Failed to update dish availability");
      console.error(err);
    }
  };

  const handleAddDish = () => {
    setEditingDish(null);
    setShowDishModal(true);
  };

  const handleEditDish = (dish: UIDish) => {
    setEditingDish(dish);
    setShowDishModal(true);
  };

  const handleSaveDish = async (dishData: {
    name: string;
    description: string;
    price: number;
    img: string;
    vipOnly: boolean;
  }) => {
    if (!user) return;

    try {
      if (editingDish) {
        await updateDish(editingDish.id, dishData);
      } else {
        await createDish(user.id, dishData);
      }
      
      await loadDishes();
      setShowDishModal(false);
      setEditingDish(null);
    } catch (err) {
      alert("Failed to save dish");
      console.error(err);
    }
  };

  return (
    <>
      <h1 className="h1">Menu</h1>
      <p className="muted">
        {isChef 
          ? "Manage dishes - add new items or toggle availability."
          : isManager
          ? "View all dishes in the restaurant catalog."
          : user 
          ? `Welcome, ${user.name}!` 
          : "Log in to place an order."}
      </p>

      {/* Chef: Add New Dish Button */}
      {canManageDishes && (
        <button className="btn" onClick={handleAddDish} style={{ marginBottom: "20px" }}>
          + Add New Dish
        </button>
      )}

      {/* Search Bar */}
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
              canManageDishes ? (
                // CHEF VIEW: Custom card with toggle and edit
                <ChefDishCard
                  key={d.id}
                  dish={d}
                  onToggleAvailability={handleToggleAvailability}
                  onEdit={handleEditDish}
                />
              ) : canSeeCreatedBy ? (
                // MANAGER VIEW: Card with created by info but no controls
                <ManagerDishCard key={d.id} dish={d} />
              ) : (
                // CUSTOMER VIEW: Regular DishCard
                <div key={d.id} style={{ position: "relative" }}>
                  {d.vipOnly && (
                    <div style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      zIndex: 10,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}>
                      👑 VIP ONLY
                    </div>
                  )}
                  <DishCard 
                    dish={d} 
                    onOrder={handleAddToCart}
                    buttonText={addedDishId === d.id ? "✓ Added!" : "Add to Cart"}
                  />
                </div>
              )
            ))
          )}
        </div>
      )}

      {/* Add/Edit Dish Modal */}
      {showDishModal && (
        <DishModal
          dish={editingDish}
          onSave={handleSaveDish}
          onClose={() => {
            setShowDishModal(false);
            setEditingDish(null);
          }}
        />
      )}

      {/* Styles */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
          flex-shrink: 0;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e5e7eb;
          transition: 0.3s;
          border-radius: 26px;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .toggle-switch input:checked + .toggle-slider {
          background-color: #10b981;
        }
        
        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }
        
        .chef-dish-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: all 0.2s ease;
          border: 1px solid #e5e7eb;
        }
        
        .chef-dish-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }
        
        .chef-dish-card.unavailable {
          opacity: 0.7;
        }
        
        .chef-dish-card .card-img-wrapper {
          position: relative;
          width: 100%;
          height: 160px;
          overflow: hidden;
        }
        
        .chef-dish-card .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        
        .chef-dish-card:hover .card-img {
          transform: scale(1.05);
        }
        
        .chef-dish-card .badge {
          position: absolute;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        
        .chef-dish-card .vip-badge {
          top: 10px;
          right: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .chef-dish-card .unavailable-badge {
          top: 10px;
          left: 10px;
          background: #ef4444;
          color: white;
        }
        
        .chef-dish-card .card-body {
          padding: 16px;
        }
        
        .chef-dish-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .chef-dish-card .dish-name {
          font-weight: 600;
          font-size: 16px;
          color: #1f2937;
          margin: 0;
          flex: 1;
          padding-right: 8px;
        }
        
        .chef-dish-card .dish-rating {
          color: #f59e0b;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
        }
        
        .chef-dish-card .dish-price {
          font-size: 18px;
          font-weight: 700;
          color: #4f46e5;
          margin-bottom: 6px;
        }
        
        .chef-dish-card .dish-description {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 12px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .chef-dish-card .created-by {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .chef-dish-card .created-by strong {
          color: #6b7280;
        }
        
        .chef-dish-card .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
        }
        
        .chef-dish-card .toggle-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .chef-dish-card .toggle-label {
          font-size: 13px;
          font-weight: 500;
        }
        
        .chef-dish-card .toggle-label.available {
          color: #10b981;
        }
        
        .chef-dish-card .toggle-label.unavailable {
          color: #ef4444;
        }
        
        .chef-dish-card .edit-btn {
          background: #f3f4f6;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .chef-dish-card .edit-btn:hover {
          background: #e5e7eb;
          color: #1f2937;
        }
      `}</style>
    </>
  );
}

// Chef Dish Card Component
function ChefDishCard({
  dish,
  onToggleAvailability,
  onEdit,
}: {
  dish: UIDish;
  onToggleAvailability: (id: string, available: boolean) => void;
  onEdit: (dish: UIDish) => void;
}) {
  return (
    <div className={`chef-dish-card ${!dish.available ? 'unavailable' : ''}`}>
      <div className="card-img-wrapper">
        <img 
          src={dish.img || "/placeholder-dish.jpg"} 
          alt={dish.name} 
          className="card-img"
        />
        {dish.vipOnly && (
          <span className="badge vip-badge">👑 VIP ONLY</span>
        )}
        {!dish.available && (
          <span className="badge unavailable-badge">Unavailable</span>
        )}
      </div>
      
      <div className="card-body">
        <div className="card-header">
          <h3 className="dish-name">{dish.name}</h3>
          <span className="dish-rating">⭐ {(dish.rating ?? 0).toFixed(1)}</span>
        </div>
        
        <div className="dish-price">${(dish.price ?? 0).toFixed(2)}</div>
        
        {dish.description && (
          <p className="dish-description">{dish.description}</p>
        )}
        
        <div className="created-by">
          <span>Created by <strong>{dish.chefName || "Unknown chef"}</strong></span>
        </div>
        
        <div className="card-footer">
          <div className="toggle-wrapper">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={dish.available}
                onChange={(e) => onToggleAvailability(dish.id, e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className={`toggle-label ${dish.available ? 'available' : 'unavailable'}`}>
              {dish.available ? "Available" : "Unavailable"}
            </span>
          </div>
          
          <button className="edit-btn" onClick={() => onEdit(dish)}>
            ✏️ Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// Manager Dish Card Component (read-only with created by)
function ManagerDishCard({ dish }: { dish: UIDish }) {
  return (
    <div className={`chef-dish-card ${!dish.available ? 'unavailable' : ''}`}>
      <div className="card-img-wrapper">
        <img 
          src={dish.img || "/placeholder-dish.jpg"} 
          alt={dish.name} 
          className="card-img"
        />
        {dish.vipOnly && (
          <span className="badge vip-badge">👑 VIP ONLY</span>
        )}
        {!dish.available && (
          <span className="badge unavailable-badge">Unavailable</span>
        )}
      </div>
      
      <div className="card-body">
        <div className="card-header">
          <h3 className="dish-name">{dish.name}</h3>
          <span className="dish-rating">⭐ {(dish.rating ?? 0).toFixed(1)}</span>
        </div>
        
        <div className="dish-price">${(dish.price ?? 0).toFixed(2)}</div>
        
        {dish.description && (
          <p className="dish-description">{dish.description}</p>
        )}
        
        <div className="created-by">
          <span>👨‍🍳</span>
          <span>Created by <strong>{dish.chefName || "Unknown chef"}</strong></span>
        </div>
        
        <div className="card-footer" style={{ justifyContent: "flex-start" }}>
          <span className={`toggle-label ${dish.available ? 'available' : 'unavailable'}`}>
            {dish.available ? "✓ Available" : "✕ Unavailable"}
          </span>
        </div>
      </div>
    </div>
  );
}

// Dish Modal Component
function DishModal({
  dish,
  onSave,
  onClose,
}: {
  dish: UIDish | null;
  onSave: (data: {
    name: string;
    description: string;
    price: number;
    img: string;
    vipOnly: boolean;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(dish?.name || "");
  const [description, setDescription] = useState(dish?.description || "");
  const [price, setPrice] = useState(dish?.price?.toString() || "");
  const [img, setImg] = useState(dish?.img || "");
  const [vipOnly, setVipOnly] = useState(dish?.vipOnly || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter a dish name");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price");
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      img: img.trim(),
      vipOnly,
    });
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "20px",
          padding: "28px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "24px"
        }}>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
            {dish ? "Edit Dish" : "Add New Dish"}
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: "#f3f4f6",
              border: "none",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              fontSize: "20px",
              cursor: "pointer",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#374151" }}>
              Dish Name *
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wagyu Beef Steak"
              required
              style={{ fontSize: "15px" }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#374151" }}>
              Price *
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontWeight: 500 }}>$</span>
              <input
                type="number"
                className="input"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                style={{ paddingLeft: "28px", fontSize: "15px" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#374151" }}>
              Description
            </label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your dish..."
              rows={3}
              style={{ resize: "vertical", fontSize: "15px" }}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#374151" }}>
              Image URL
            </label>
            <input
              type="url"
              className="input"
              value={img}
              onChange={(e) => setImg(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{ fontSize: "15px" }}
            />
          </div>

          {/* VIP Toggle */}
          <div style={{ 
            marginBottom: "24px",
            padding: "16px",
            backgroundColor: vipOnly ? "#f5f3ff" : "#f9fafb",
            borderRadius: "12px",
            border: vipOnly ? "2px solid #8b5cf6" : "1px solid #e5e7eb",
            transition: "all 0.2s ease",
          }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              cursor: "pointer"
            }}>
              <div>
                <div style={{ fontWeight: 600, color: vipOnly ? "#7c3aed" : "#374151", fontSize: "15px" }}>
                  {vipOnly ? "👑 VIP-Only Dish" : "Regular Dish"}
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                  {vipOnly
                    ? "Only visible to VIP customers"
                    : "Available to all customers"}
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={vipOnly}
                  onChange={(e) => setVipOnly(e.target.checked)}
                />
                <span className="toggle-slider" style={{ backgroundColor: vipOnly ? "#8b5cf6" : "#e5e7eb" }}></span>
              </label>
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              type="button" 
              className="btn ghost" 
              onClick={onClose}
              style={{ flex: 1, padding: "12px" }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn"
              style={{ flex: 1, padding: "12px" }}
            >
              {dish ? "Update Dish" : "Create Dish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}