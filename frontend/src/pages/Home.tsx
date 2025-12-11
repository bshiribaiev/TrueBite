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
  userAverageRating?: number; // User's personal average rating for this dish
}

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  // Global stats (for visitors/new customers)
  const [popular, setPopular] = useState<DishWithStats[]>([]);
  const [topRated, setTopRated] = useState<DishWithStats[]>([]);
  
  // Personalized stats (for returning customers)
  const [userFavorites, setUserFavorites] = useState<DishWithStats[]>([]); // Most ordered by user
  const [userHighestRated, setUserHighestRated] = useState<DishWithStats[]>([]); // User's 4+ star rated dishes
  const [recommendedForYou, setRecommendedForYou] = useState<DishWithStats[]>([]); // Highly rated dishes user hasn't tried
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  
  const [loading, setLoading] = useState(true);
  
  // Added to cart feedback
  const [addedDishId, setAddedDishId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDishStats = async () => {
      try {
        // Step 1: Fetch all available dishes from dishes collection
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
            rating: d.rating ?? 0, // Global average rating
            orderCount: 0,
          });
        });

        // Step 2: Fetch all orders from "deliveries" collection to calculate popularity
        const ordersSnapshot = await getDocs(collection(db, "deliveries"));
        const allOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Track which dishes the user has ordered (for "Your Favorites")
        const userOrderedDishes = new Map<string, number>(); // dishId -> total quantity ordered
        let userOrderCount = 0;

        allOrders.forEach((order: any) => {
          const isUserOrder = user && order.customerId === user.id;
          
          if (isUserOrder) {
            userOrderCount++;
          }

          order.items?.forEach((item: any) => {
            const dishId = item.dishId || item.id;

            // Update global order count for popularity
            if (dishesMap.has(dishId)) {
              const dish = dishesMap.get(dishId)!;
              dish.orderCount += item.quantity || 1;
            }

            // Track user's order history
            if (isUserOrder && dishId) {
              const currentCount = userOrderedDishes.get(dishId) || 0;
              userOrderedDishes.set(dishId, currentCount + (item.quantity || 1));
            }
          });
        });

        // Step 3: Fetch user's personal ratings from "ratings" collection
        const userDishRatings = new Map<string, { totalScore: number; count: number }>();
        
        if (user) {
          const ratingsSnapshot = await getDocs(collection(db, "ratings"));
          
          ratingsSnapshot.docs.forEach((docSnap) => {
            const rating = docSnap.data();
            
            // Only include this user's ratings
            if (rating.customerId === user.id && rating.dishId && rating.score) {
              const dishId = rating.dishId;
              
              if (!userDishRatings.has(dishId)) {
                userDishRatings.set(dishId, { totalScore: 0, count: 0 });
              }
              
              const stats = userDishRatings.get(dishId)!;
              stats.totalScore += rating.score;
              stats.count += 1;
            }
          });
        }

        const allDishes = Array.from(dishesMap.values());

        // Check if user is a returning customer (has placed orders before)
        const hasOrderHistory = user && userOrderCount > 0;
        setIsReturningCustomer(!!hasOrderHistory);

        if (hasOrderHistory) {
          // ─────────────────────────────────────────────────────────────
          // PERSONALIZED SECTIONS for returning customers
          // ─────────────────────────────────────────────────────────────

          // 1. YOUR FAVORITES: Dishes the user has ordered most (by quantity)
          const favorites = Array.from(userOrderedDishes.entries())
            .map(([dishId, orderCount]) => {
              const dish = dishesMap.get(dishId);
              if (dish) {
                return { ...dish, orderCount };
              }
              return null;
            })
            .filter((d): d is DishWithStats => d !== null)
            .sort((a, b) => b.orderCount - a.orderCount)
            .slice(0, 6);

          setUserFavorites(favorites);

          // 2. HIGHEST RATED: Dishes the user has personally rated 4+ stars
          const highestRatedByUser = Array.from(userDishRatings.entries())
            .map(([dishId, stats]) => {
              const dish = dishesMap.get(dishId);
              const userAverage = stats.totalScore / stats.count;
              
              // Only include dishes rated 4+ stars by this user
              if (dish && userAverage >= 4) {
                return { 
                  ...dish, 
                  userAverageRating: userAverage,
                  rating: userAverage // Display user's rating
                };
              }
              return null;
            })
            .filter((d): d is DishWithStats => d !== null)
            .sort((a, b) => (b.userAverageRating ?? 0) - (a.userAverageRating ?? 0))
            .slice(0, 6);

          setUserHighestRated(highestRatedByUser);

          // 3. RECOMMENDED FOR YOU: Highly-rated dishes (global) user hasn't ordered
          const notOrderedByUser = allDishes.filter(
            d => !userOrderedDishes.has(d.id) && (d.rating ?? 0) > 0
          );
          
          const recommendations = notOrderedByUser
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            .slice(0, 6);

          // If not enough rated dishes, fill with popular dishes they haven't tried
          if (recommendations.length < 6) {
            const additionalRecs = allDishes
              .filter(d => !userOrderedDishes.has(d.id) && !recommendations.includes(d))
              .sort((a, b) => b.orderCount - a.orderCount)
              .slice(0, 6 - recommendations.length);
            recommendations.push(...additionalRecs);
          }

          setRecommendedForYou(recommendations);
        }

        // ─────────────────────────────────────────────────────────────
        // GLOBAL SECTIONS (for visitors OR as additional sections)
        // ─────────────────────────────────────────────────────────────

        // Most Popular: by total order count across all users
        const mostPopular = [...allDishes]
          .filter((d) => d.orderCount > 0)
          .sort((a, b) => b.orderCount - a.orderCount)
          .slice(0, 6);

        // Top Rated: by global average rating
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
  }, [user]);

  const handleAddToCart = (id: string) => {
    if (!user) {
      nav("/login");
      return;
    }

    // Find dish from any of our lists
    const dish = 
      popular.find((d) => d.id === id) || 
      topRated.find((d) => d.id === id) ||
      userFavorites.find((d) => d.id === id) ||
      userHighestRated.find((d) => d.id === id) ||
      recommendedForYou.find((d) => d.id === id);
      
    if (!dish) return;

    addItem({
      id: dish.id,
      name: dish.name,
      price: dish.price ?? 0,
      image: dish.img,
    });
    
    // Show brief "Added!" feedback
    setAddedDishId(id);
    setTimeout(() => setAddedDishId(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p>Loading dishes...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RETURNING CUSTOMER VIEW - Personalized sections
  // ─────────────────────────────────────────────────────────────
  if (isReturningCustomer && user) {
    return (
      <>
        <h1 className="h1">Welcome back, {user.name}!</h1>
        <p className="muted">Here are some dishes picked just for you.</p>

        {/* Your Favorites - most ordered by this user */}
        <Section title="❤️ Your Favorites">
          {userFavorites.length > 0 ? (
            <div className="grid">
              {userFavorites.map((d) => (
                <DishCard 
                  key={d.id} 
                  dish={d} 
                  onOrder={handleAddToCart}
                  buttonText={addedDishId === d.id ? "✓ Added!" : "Add to Cart"}
                />
              ))}
            </div>
          ) : (
            <p className="muted">Start ordering to see your favorites here!</p>
          )}
        </Section>

        {/* Highest Rated - dishes this user rated 4+ stars */}
        <Section title="⭐ Your Highest Rated">
          {userHighestRated.length > 0 ? (
            <div className="grid">
              {userHighestRated.map((d) => (
                <DishCard 
                  key={d.id} 
                  dish={d} 
                  onOrder={handleAddToCart}
                  buttonText={addedDishId === d.id ? "✓ Added!" : "Add to Cart"}
                />
              ))}
            </div>
          ) : (
            <p className="muted">Rate dishes 4+ stars to see them here!</p>
          )}
        </Section>

        {/* Recommended - highly rated dishes (global) user hasn't tried */}
        <Section title="✨ Recommended For You">
          {recommendedForYou.length > 0 ? (
            <div className="grid">
              {recommendedForYou.map((d) => (
                <DishCard 
                  key={d.id} 
                  dish={d} 
                  onOrder={handleAddToCart}
                  buttonText={addedDishId === d.id ? "✓ Added!" : "Add to Cart"}
                />
              ))}
            </div>
          ) : (
            <p className="muted">You've tried everything! Check back for new dishes.</p>
          )}
        </Section>

        {/* Trending Now - global top rated */}
        <Section title="🔥 Trending Now">
          {topRated.length > 0 ? (
            <div className="grid">
              {topRated.slice(0, 4).map((d) => (
                <DishCard 
                  key={d.id} 
                  dish={d} 
                  onOrder={handleAddToCart}
                  buttonText={addedDishId === d.id ? "✓ Added!" : "Add to Cart"}
                />
              ))}
            </div>
          ) : (
            <p className="muted">No trending dishes yet.</p>
          )}
        </Section>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VISITOR / NEW CUSTOMER VIEW - Global stats only
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <h1 className="h1">Welcome to TrueBite</h1>
      <p className="muted">
        {user 
          ? "Discover our top dishes and start ordering!" 
          : "Discover top-rated dishes, then sign in to order."}
      </p>

      <Section title="🔥 Most Popular">
        {popular.length > 0 ? (
          <div className="grid">
            {popular.map((d) => (
              <DishCard 
                key={d.id} 
                dish={d} 
                onOrder={handleAddToCart}
                buttonText={addedDishId === d.id ? "✓ Added!" : "Add to Cart"}
              />
            ))}
          </div>
        ) : (
          <p className="muted">No orders yet. Be the first to order!</p>
        )}
      </Section>

      <Section title="⭐ Top Rated">
        {topRated.length > 0 ? (
          <div className="grid">
            {topRated.map((d) => (
              <DishCard 
                key={d.id} 
                dish={d} 
                onOrder={handleAddToCart}
                buttonText={addedDishId === d.id ? "✓ Added!" : "Add to Cart"}
              />
            ))}
          </div>
        ) : (
          <p className="muted">No rated dishes yet. Order and leave a review!</p>
        )}
      </Section>
    </>
  );
}