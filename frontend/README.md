#  TrueBite Frontend

**TrueBite** is a modern web application built with **Vite + React + TypeScript** and styled using **Tailwind CSS**.  
This frontend serves as the user interface for browsing, ordering, and managing top-rated dishes, featuring clean routing, component-based architecture, and contextual authentication.

---

## Project Overview

This is the **initial setup commit**, establishing the foundation for the TrueBite frontend.  
It includes all base configurations, routing, and mock data for core UI pages.

### Key Features
-  **React + TypeScript + Vite** setup with Hot Module Reload (HMR)
-  **Tailwind CSS** styling for responsive design
-  **React Router** integrated with pages (`Home`, `Menu`, `Login`, `Dashboard`, `Chat`)
-  **AuthContext Provider** for authentication state management
-  **Reusable Components** such as `DishCard` and `Section`
-  Mock data structure (`mock/data.ts`) for placeholder dish listings
-  Configured ESLint + TypeScript rules for clean, consistent code

---

##  Tech Stack

| Category | Technology |
|-----------|-------------|
| Framework | [React](https://react.dev/) |
| Build Tool | [Vite](https://vitejs.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Routing | [React Router](https://reactrouter.com/) |
| State Management | React Context API (`AuthContext`) |
| Mock Data | TypeScript object arrays (`src/mock/data.ts`) |

---

## Getting Started

### 1. Clone and install dependencies
```bash
git clone https://github.com/bshiribaiev/foodline.git
cd truebite-frontend
npm install
```


## Development Notes

- Ensure AuthProvider wraps <App /> in main.tsx for all routes to function correctly.

- To add new pages, define your component in /pages and register it in App.tsx routes.

- You can safely modify or extend the Dish mock data in src/mock/data.ts.