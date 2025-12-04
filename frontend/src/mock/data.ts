export type Dish = {
  id: string;
  name: string;
  price: number;
  rating: number;
  img: string;
  chefId: string;
};

export const dishes: Dish[] = [
  { id: "d1", name: "Spicy Ramen",      price: 14.5, rating: 4.6, img: "https://dinnerthendessert.com/wp-content/uploads/2023/08/Spicy-Ramen-10.jpg",   chefId: "c1" },
  { id: "d2", name: "Sushi Platter",     price: 22,   rating: 4.8, img: "https://popmenucloud.com/cdn-cgi/image/width%3D1200%2Cheight%3D1200%2Cfit%3Dscale-down%2Cformat%3Dauto%2Cquality%3D60/kdfpaeib/16fbb8ca-0ac6-4e7d-a505-6d1f13621624.jpg",   chefId: "c2" },
  { id: "d3", name: "Bibimbap",         price: 13,   rating: 4.4, img: "https://www.siftandsimmer.com/wp-content/uploads/2023/05/bibimbap-featured.jpg",    chefId: "c1" },
  { id: "d4", name: "Tacos",        price: 11,   rating: 4.2, img: "https://static01.nyt.com/images/2025/05/14/multimedia/kf-easy-chicken-tacos-gwfh/kf-easy-chicken-tacos-gwfh-jumbo-v2.jpg",   chefId: "c3" },
  { id: "d5", name: "Margherita Pizza", price: 16,   rating: 4.7, img: "https://cdn.loveandlemons.com/wp-content/uploads/opengraph/2023/07/margherita-pizza-recipe.jpg",   chefId: "c4" },
  { id: "d6", name: "Pad Thai",         price: 15,   rating: 4.5, img: "https://inquiringchef.com/wp-content/uploads/2023/02/Authentic-Pad-Thai_square-1908.jpg", chefId: "c2" },
];

export const popular  = dishes.slice(0, 3);
export const topRated = [...dishes].sort((a, b) => b.rating - a.rating).slice(0, 3);

console.log("exports", { hasDish: true, count: dishes.length });