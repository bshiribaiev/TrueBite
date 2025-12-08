## TrueBite Backend – Setup Guide

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


