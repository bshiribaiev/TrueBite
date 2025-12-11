## TrueBite – AI‑Enabled Restaurant Order & Delivery System

TrueBite is an **AI‑enabled restaurant order and delivery management system** that simulates a real restaurant with three categories of users:
- **Employees**: chefs, delivery personnel, manager  
- **Customers**: registered and VIP  
- **Visitors**: unregistered guests

The system integrates an intelligent **two‑tier chatbot** (local knowledge base → Gemini fallback), real‑time ordering and delivery workflows, and rich dashboards for all roles. Real‑time data is powered by **Firebase Firestore**, while the backend exposes REST APIs (including the RAG chatbot and finance system) via **Flask**.

---

## Technology Stack

### Frontend
- **Node.js**: 18+
- **React**: 18.x
- **TypeScript**: 5.x
- **Vite**: dev & build tool
- **Firebase JavaScript SDK**: v10.x (Auth, Firestore)
- **Material‑UI (MUI)** and **custom CSS** for UI
- **Web Speech API** for voice‑based menu search on the Menu page

### Backend / Data / AI
- **Flask** (Python) REST API, including:
  - RAG chatbot service (`ChatService` using ChromaDB + local embeddings)
  - Finance wallet/transactions service backed by Firestore
- **Firebase Firestore**: primary database for users, dishes, orders, complaints, ratings, etc.
- **Firebase Authentication**: source of truth for user identities, roles, and login
- **ChromaDB**: local vector store for menu item embeddings
- **SentenceTransformers** (`all-MiniLM-L6-v2`) via Chroma for local, free embeddings
- **Google Generative AI SDK** (Gemini) as an LLM fallback when the local KB is not sufficient

---

## Repository Structure

- `frontend/` – React + Vite SPA (dashboards, chat UI, menu, forums, etc.)
- `backend/`
  - `app/`
    - `routes/` – REST API endpoints (`chat.py`, `finance.py`, `menu.py`, `orders.py`, etc.)
    - `services/` – business logic (RAG chatbot in `llm.py`, finance in `finance_service.py`, orders, etc.)
    - `firebase_client.py` – singleton Firestore client using Firebase Admin SDK
    - `config.py` – Flask and environment configuration
    - `utils/` – decorators, validators, helpers
  - `sync_kb.py` – syncs Firestore dishes into ChromaDB (knowledge base)
  - `assign_chefs_to_dishes.py` – helper script to assign chefs to dishes in Firestore
  - `instance/` – local data (e.g., ChromaDB files, legacy SQLite DB)
- `database/` – SQL schema/seed artifacts from an earlier design phase
- `phase_2/` – design documents (use‑case diagrams, sequence diagrams, Petri nets, etc.)

---

## Prerequisites

- **Node.js**: v18 or later
- **npm**: comes with Node
- **Python**: 3.11+ recommended
- **Firebase project** with:
  - Authentication (Email/Password enabled)
  - Firestore in **production mode**
- **Firebase service account JSON** with Firestore access (for the backend)
- **Google Gemini API key** (for chatbot fallback)

---

## Backend Setup (Flask + Firestore + RAG Chatbot)

1. **Navigate to the backend folder**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate        # macOS / Linux
   # .\venv\Scripts\activate       # Windows (PowerShell)
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Add Firebase service account JSON**
   - Place your service account file in `backend/app/`, for example:
     - `backend/app/truebite-csc-firebase-adminsdk-fbsvc-6311932c04.json`
   - Or point to a custom path via the `FIREBASE_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS` environment variable.

5. **Configure environment variables**

   Create a `.env` file in `backend/` with at least:
   ```env
   FLASK_ENV=development
   JWT_SECRET_KEY=change_me_in_production

   # Google Gemini
   GOOGLE_API_KEY=your_gemini_api_key_here

   # Firebase Admin (one of the following)
   FIREBASE_CREDENTIALS=/absolute/path/to/your-service-account.json
   # or:
   # GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-service-account.json
   ```

6. **Run the Flask backend (port 5001)**
   ```bash
   # From backend/
   python run.py
   ```

   The backend exposes REST endpoints such as:
   - `POST http://localhost:5001/chat/ask` – chatbot query (RAG + Gemini fallback)
   - `POST http://localhost:5001/chat/rate` – rate a chatbot answer
   - `POST http://localhost:5001/finance/add-funds`, etc.

7. **(Optional) Build or refresh the knowledge base**
   - Ensure your Firestore `dishes` collection is populated (from the frontend mock data seeding script or manually).
   - From `backend/`, run:
     ```bash
     source venv/bin/activate
     python sync_kb.py
     ```
   - This reads all available dishes from Firestore, embeds them with SentenceTransformers, and stores them in a local ChromaDB collection for fast semantic search.

---

## Frontend Setup (React + Vite)

1. **Navigate to the frontend folder**
   ```bash
   cd frontend
   ```

2. **Configure Firebase for the frontend**
   - Create or update `src/firebase/config.ts` with your Firebase web config (from the Firebase console).
   - Ensure Authentication and Firestore are enabled in your Firebase project.

3. **Configure environment variables**
   - Create a `.env` file in `frontend/` for any frontend‑side keys (e.g. base URLs):
     ```env
     VITE_BACKEND_URL=http://localhost:5001
     ```
   - The Gemini **server‑side** key is stored only in `backend/.env` (not exposed to the browser).

4. **Install frontend dependencies**
   ```bash
   npm install
   ```

5. **Run the frontend dev server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   - Visit `http://localhost:5173`
   - Register and create a **manager** account first (manager dashboard can then manage staff, deliveries, and complaints).

---

## AI Chatbot Architecture

- **Retrieval‑Augmented Generation (RAG)**:
  - The backend periodically syncs menu items from Firestore into **ChromaDB** (`sync_kb.py` and `ChatService.sync_knowledge_base`).
  - Each dish is embedded using `all-MiniLM-L6-v2` and stored as a vector.
  - User questions hit `/chat/ask`, which:
    - Classifies the question (e.g., price‑related vs. general).
    - Retrieves the most relevant dishes from ChromaDB.
    - If relevant context exists (and is especially needed for prices), it uses a **RAG prompt** that incorporates dish fields (name, description, price, VIP flags).
    - Otherwise it falls back to a **Gemini‑only** prompt that uses general culinary knowledge but still respects TrueBite‑specific business rules (e.g., 24/7 hours, delivery availability).

- **Rating & Moderation**:
  - The chat UI allows users to rate each response from **0–5 stars**.
  - Ratings are posted to `/chat/rate`, which:
    - Stores them in the `chat_ratings` Firestore collection.
    - Links each rating back to the relevant dishes and chefs (via `kbIds` → `dishes` → `chefId`).
    - Flags **0‑star (“outrageous”)** responses for manager review.

- **UI Integration**:
  - A full‑page Chat screen provides a detailed chat experience.
  - A **floating chat widget** appears on most pages, letting customers quickly ask questions without leaving their current context.

---

## Key Implemented Features 

The following core features are fully implemented:
- **GUI & personalized dashboards**
- **Picture‑based menu browsing**
- **Secure login with Firebase Authentication**
- **Role support**: Visitor, Registered Customer, VIP, Chef, Delivery Person, Manager
- **Ordering system with real‑time updates**
- **Dish creation & management** (chef)
- **Delivery bidding** and **manager assignment of deliveries**
- **AI chatbot** (local KB → Gemini fallback)
- **Complaint, compliment, and warning system**
- **HR rules**: promotions, demotions, bonuses, firing
- **Wallet and finance system** (deposits, transaction history, insufficient‑fund warnings)
- **VIP logic**: automatic upgrade, discounts, free deliveries
- **Discussion forums with moderation**
- **Creative feature**: **voice‑based menu search** on the Menu page

Partially implemented items (e.g., chef KB contribution UI polish, VIP free delivery counter visibility) are described in the project report but do not affect basic operation of the system.

---

## Team

As documented in the final report, the project was developed by:
- **Arsenii Chan**
- **Angus Chen**
- **Nick Kontonicolaou**
- **Diana Lucero**
- **Bekbol Shiribaiev**

All members contributed approximately equally across backend, frontend, AI, and UI/UX work.

This backend powers the TrueBite app (Flask API, RAG chatbot, finance logic).  
Follow these steps to get it running on a new machine.

---

### 1. Prerequisites

- Python 3.11 or 3.13 installed
- `pip` available
- Access to:
  - A **Gemini API key**
  - A **Firebase project** with Firestore and a **service account JSON**

---

### 2. Create and activate a virtual environment

From the `backend/` directory:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # on macOS/Linux
# .\venv\Scripts\activate  # on Windows PowerShell
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

---

### 3. Configure environment variables (`.env`)

Create a file `backend/.env` with at least:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

- `GOOGLE_API_KEY` is used by `google-generativeai` in `app/services/llm.py` for the chatbot.
- You can also override `DATABASE_URL`, `JWT_SECRET_KEY`, etc. (see `app/config.py`).

---

### 4. Add Firebase service account JSON

Ask the Firebase admin on your team to generate a **service account key** for the project:

1. Go to Google Cloud Console → IAM & Admin → Service Accounts.
2. Select the Firebase project.
3. Create (or select) a service account with Firestore access.
4. Add key → JSON → download.

Save the JSON file into `backend/`, for example:

```text
backend/truebite-csc-firebase-adminsdk-....json
```

The backend will automatically look for this file using the path configured in  
`app/firebase_client.py` (see `DEFAULT_SERVICE_ACCOUNT_PATH`).  
Alternatively, you can point to any JSON path via env vars:

```bash
export FIREBASE_CREDENTIALS=/absolute/path/to/service-account.json
# or
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

This service account is used to:

- Read/write Firestore collections such as `dishes`, `users`, `transactions`, `chat_ratings`.
- Build the chatbot knowledge base from Firestore.

---

### 5. Build the chatbot knowledge base (RAG)

The chatbot uses a local Chroma vector store and a small Hugging Face embedding model.

To sync Firestore dishes into the KB:

```bash
cd backend
source venv/bin/activate
python sync_kb.py
```

This script:

- Loads available dishes from Firestore (`dishes` collection).
- Builds text descriptions and stores them in `instance/knowledge_base` with embeddings.

You should re-run `sync_kb.py` after you make significant menu changes.

---

### 6. Run the backend server

From `backend/`:

```bash
cd backend
source venv/bin/activate
python run.py
```

By default this starts Flask on:

- `http://localhost:5001`

Key routes:

- `GET /` – health check (`TrueBite API is running`).
- `POST /api/chat/ask` – chatbot endpoint.
- `POST /api/chat/rate` – store user rating for a chatbot answer.
- `/api/finance/...` – wallet/transactions API (backed by Firestore).
- `/api/menu/...` and `/api/orders/...` – other app APIs, if implemented.

Make sure the frontend is configured to call `http://localhost:5001` for API URLs (see `frontend/src/services/api.ts`).

---

### 7. Common issues

- **`ModuleNotFoundError: firebase_admin`**  
  → Run `pip install -r requirements.txt` inside the `venv`.

- **Chatbot says it's not configured correctly**  
  → Ensure `GOOGLE_API_KEY` is set in `.env` and reload the server.

- **Firestore permission errors**  
  → Check that your service account JSON has Firestore access and that  
    `FIREBASE_CREDENTIALS` / `GOOGLE_APPLICATION_CREDENTIALS` or  
    `DEFAULT_SERVICE_ACCOUNT_PATH` are correctly pointing to it.


