import os
import google.generativeai as genai
import chromadb
from chromadb.utils import embedding_functions
from flask import current_app
from app.models.dish import Dish
from app import db

class ChatService:
    _instance = None
    
    def __init__(self):
        api_key = current_app.config.get('GOOGLE_API_KEY')
        if not api_key:
            print("Warning: GOOGLE_API_KEY not set. Chat features will not work.")
            return
            
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Initialize ChromaDB (in-memory for now, or persistent)
        # Using a local folder for persistence so we don't re-index every restart
        self.chroma_client = chromadb.PersistentClient(path="./instance/knowledge_base")
        
        # Use Gemini for embeddings if possible, or default to a lightweight local model
        # For simplicity in this implementation, we'll use Gemini's embedding model manually
        # or use Chroma's default which downloads a small model.
        # Let's use Gemini embeddings for consistency.
        self.collection = self.chroma_client.get_or_create_collection(
            name="menu_items",
            metadata={"hnsw:space": "cosine"}
        )

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def generate_embedding(self, text):
        """Generate embedding using Gemini"""
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
            title="Menu Item"
        )
        return result['embedding']

    def sync_knowledge_base(self):
        """Re-index all menu items into the vector store"""
        if not current_app.config.get('GOOGLE_API_KEY'):
            return False

        try:
            # Clear existing
            # self.chroma_client.delete_collection("menu_items") 
            # self.collection = self.chroma_client.create_collection("menu_items")
            # Better: just upsert
            
            dishes = Dish.query.filter_by(is_available=True).all()
            
            ids = []
            documents = []
            metadatas = []
            embeddings = []

            for dish in dishes:
                # Create a rich description for the vector store
                content = f"Dish: {dish.name}. Price: ${dish.price}. Description: {dish.description}. "
                if dish.is_vip_only:
                    content += "This is a VIP exclusive dish. "
                
                ids.append(str(dish.id))
                documents.append(content)
                metadatas.append({
                    "name": dish.name,
                    "price": float(dish.price),
                    "id": dish.id
                })
                
                # Generate embedding
                # Note: In production, batch this to avoid rate limits
                emb = self.generate_embedding(content)
                embeddings.append(emb)

            if ids:
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    embeddings=embeddings,
                    metadatas=metadatas
                )
            return True
        except Exception as e:
            print(f"Error syncing knowledge base: {e}")
            return False

    def get_response(self, user_query):
        """RAG flow: Retrieve -> Generate"""
        if not current_app.config.get('GOOGLE_API_KEY'):
            return "I'm sorry, but I'm not configured correctly to answer questions right now."

        try:
            # 1. Embed the query
            query_embedding = genai.embed_content(
                model="models/embedding-001",
                content=user_query,
                task_type="retrieval_query"
            )

            # 2. Search Knowledge Base
            results = self.collection.query(
                query_embeddings=[query_embedding['embedding']],
                n_results=3
            )

            # 3. Construct Context
            context = ""
            if results['documents']:
                context = "\n".join(results['documents'][0])

            # 4. Generate Response
            system_prompt = f"""You are a helpful customer service assistant for TrueBite restaurant.
            Use the following context about our menu to answer the user's question.
            If the answer is not in the context, politely say you don't know and offer to connect them with a human manager.
            Do not make up menu items or prices.
            
            Context:
            {context}
            """
            
            chat = self.model.start_chat(history=[
                {"role": "user", "parts": [system_prompt + f"\n\nUser Question: {user_query}"]}
            ])
            
            response = chat.last.text
            return response

        except Exception as e:
            print(f"Error generating response: {e}")
            return "I'm sorry, I encountered an error processing your request."
