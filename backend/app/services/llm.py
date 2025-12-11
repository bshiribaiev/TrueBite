import os
import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
from flask import current_app

from app.firebase_client import get_firestore


# Restaurant info that the bot should know
TRUEBITE_INFO = {
    "name": "TrueBite",
    "hours": "24/7 - We're open around the clock!",
    "delivery": "Yes, we offer delivery! You can place an order through our app and a delivery person will bring it right to your door.",
    "location": "Available through our mobile app",
}


class ChatService:
    _instance = None
    
    def __init__(self):
        api_key = current_app.config.get('GOOGLE_API_KEY')
        if not api_key:
            print("Warning: GOOGLE_API_KEY not set. Chat features will not work.")
            return
            
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Initialize ChromaDB (persistent local vector store)
        self.chroma_client = chromadb.PersistentClient(path="./instance/knowledge_base")

        # Use a free local Hugging Face embedding model instead of Gemini embeddings
        # This avoids embed_content quota limits.
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        # Attach the embedding function to the collection so Chroma handles embeddings.
        self.collection = self.chroma_client.get_or_create_collection(
            name="menu_items",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_menu_summary(self) -> str:
        """Fetch all available dishes from Firestore and create a menu summary."""
        try:
            db_fs = get_firestore()
            dishes_ref = db_fs.collection("dishes")
            snap = dishes_ref.where("available", "==", True).get()
            
            if not snap:
                return "Our menu is currently being updated. Please check back soon!"
            
            menu_items = []
            for doc in snap:
                data = doc.to_dict() or {}
                name = data.get("name", "Unnamed dish")
                price = data.get("price", 0)
                menu_items.append(f"{name} - ${price:.2f}")
            
            if menu_items:
                return "Here's what's on our menu:\n\n" + "\n".join(menu_items)
            else:
                return "Our menu is currently being updated. Please check back soon!"
        except Exception as e:
            print(f"Error fetching menu: {e}")
            return "I'm having trouble loading the menu right now. Please try again or check the Menu page in the app."

    def _handle_common_questions(self, user_query: str) -> str | None:
        """
        Handle common restaurant questions without needing RAG.
        Returns a response string if matched, None otherwise.
        """
        q_lower = user_query.lower().strip()
        
        # Hours questions
        if any(kw in q_lower for kw in ["hour", "open", "close", "when are you", "what time"]):
            return f"TrueBite is open {TRUEBITE_INFO['hours']} So you can order anytime!"
        
        # Delivery questions
        if any(kw in q_lower for kw in ["deliver", "delivery", "ship", "bring"]):
            return TRUEBITE_INFO["delivery"]
        
        # Menu listing questions
        if any(phrase in q_lower for phrase in [
            "what's on the menu", "whats on the menu", "what is on the menu",
            "show me the menu", "list the menu", "menu items", "what do you have",
            "what do you sell", "what can i order", "what dishes"
        ]):
            return self._get_menu_summary()
        
        return None

    def _generate_llm_only(self, user_query: str) -> str:
        """
        Fallback: call the LLM directly without embeddings / vector search.
        Used when embedding quota is exceeded or Chroma/KB is unavailable.
        """
        try:
            prompt = f"""
You are a helpful customer service assistant for TrueBite restaurant.
Here are key facts about TrueBite:
- Operating hours: {TRUEBITE_INFO['hours']}
- Delivery: {TRUEBITE_INFO['delivery']}

Answer the user's question. If it's about food in general, use your culinary knowledge.
If it's a specific question about TrueBite's menu prices or items that you don't know,
suggest they check the Menu page in the app.
Write your answer as plain text with complete sentences only – no bullet points,
no markdown, and no asterisks.

User question: {user_query}
"""
            result = self.model.generate_content(prompt)
            return result.text or "I'm sorry, I can't answer that right now."
        except Exception as e:
            print(f"Error in LLM-only fallback: {e}")
            return "I'm sorry, I'm temporarily unable to answer questions."

    def sync_knowledge_base(self):
        """Re-index all menu items into the vector store"""
        try:
            # Load dishes from Firestore instead of the local SQL database.
            db_fs = get_firestore()
            dishes_ref = db_fs.collection("dishes")
            # Only include available dishes in the KB
            snap = dishes_ref.where("available", "==", True).get()

            ids = []
            documents = []
            metadatas = []

            for doc in snap:
                data = doc.to_dict() or {}
                name = data.get("name", "Unnamed dish")
                price = data.get("price", 0)
                description = data.get("description", "")
                is_vip_only = data.get("is_vip_only") or data.get("vipOnly") or False
                has_description = bool(str(description).strip())

                # Create a rich description for the vector store
                content = f"Dish: {name}. Price: ${price}. Description: {description}. "
                if is_vip_only:
                    content += "This is a VIP exclusive dish. "

                ids.append(doc.id)
                documents.append(content)
                metadatas.append(
                    {
                        "name": name,
                        "price": float(price) if price is not None else 0.0,
                        "id": doc.id,
                        "has_description": has_description,
                    }
                )
                
            if ids:
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
            return True
        except Exception as e:
            print(f"Error syncing knowledge base: {e}")
            return False

    def get_response(self, user_query):
        """RAG flow: Retrieve -> Generate"""
        if not current_app.config.get('GOOGLE_API_KEY'):
            return {
                "text": "I'm sorry, but I'm not configured correctly to answer questions right now.",
                "source": "ERROR",
                "kbIds": [],
            }

        try:
            # First, check for common restaurant questions that don't need RAG
            common_answer = self._handle_common_questions(user_query)
            if common_answer:
                return {
                    "text": common_answer,
                    "source": "INFO",
                    "kbIds": [],
                }

            # Quick intent check for price questions
            q_lower = str(user_query).lower()
            is_price_question = any(
                kw in q_lower for kw in ["price", "how much", "cost", "$"]
            )

            # 1. Search Knowledge Base using local embedding function
            results = self.collection.query(
                query_texts=[user_query],
                n_results=3,
            )

            # 2. Construct Context + similarity info from retrieved documents
            context = ""
            top_ids = []
            top_dist = None
            top_has_description = True

            if results.get("documents"):
                # results["documents"] is a list of lists
                top_docs = results["documents"][0]
                context = "\n".join(top_docs)

            if results.get("ids"):
                top_ids = results["ids"][0]

            if results.get("metadatas"):
                top_metas = results["metadatas"][0]
                if top_metas:
                    top_has_description = bool(
                        top_metas[0].get("has_description", False)
                    )

            if results.get("distances"):
                dists = results["distances"][0]
                if dists:
                    top_dist = dists[0]

            # If we have no usable KB context or it's too far away, skip RAG and
            # answer with the LLM's own reasoning.
            # For non‑price questions, also require that the top doc has a description
            # so we don't answer "what is X" from an empty KB entry.
            # For cosine distance, smaller = more similar; treat > 0.6 as low match.
            if (
                not context
                or (not is_price_question and not top_has_description)
                or (top_dist is not None and top_dist > 0.6)
            ):
                return {
                    "text": self._generate_llm_only(user_query),
                    "source": "LLM",
                    "kbIds": [],
                }

            # 3. Generate Response with LLM using the retrieved context
            prompt = f"""
You are a helpful customer service assistant for TrueBite restaurant.
Here are key facts about TrueBite:
- Operating hours: {TRUEBITE_INFO['hours']}
- Delivery: {TRUEBITE_INFO['delivery']}

Use the following context about our menu to answer the user's question.
If the answer is not in the context, politely say you don't know and offer to help with something else.
Do not make up menu items or prices.
Always respond in plain text with complete sentences only – no bullet points,
no markdown, and no asterisks.

Context:
{context}

User question: {user_query}
"""

            result = self.model.generate_content(prompt)
            if result is not None and getattr(result, "text", None):
                return {
                    "text": result.text,
                    "source": "KB",
                    "kbIds": top_ids,
                }

            # If for some reason the model returned no text, fall back
            return {
                "text": self._generate_llm_only(user_query),
                "source": "FALLBACK",
                "kbIds": [],
            }

        except Exception as e:
            # Common case: Gemini embedding quota exceeded (HTTP 429 / limit 0) or Chroma issues.
            print(f"Error generating response with RAG, falling back to LLM-only: {e}")
            return {
                "text": self._generate_llm_only(user_query),
                "source": "FALLBACK",
                "kbIds": [],
            }
