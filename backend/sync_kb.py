import sys
import os

# Add the current directory to the path so we can import app
sys.path.append(os.getcwd())

try:
    import google.generativeai
    print("Successfully imported google.generativeai")
    print(f"Location: {google.generativeai.__file__}")
except ImportError as e:
    print(f"Failed to import google.generativeai: {e}")
    print(f"sys.path: {sys.path}")

try:
    from app import create_app
    from app.services.llm import ChatService
    
    app = create_app()

    with app.app_context():
        print("Syncing knowledge base...")
        service = ChatService.get_instance()
        if service.sync_knowledge_base():
            print("Successfully synced knowledge base with menu items.")
        else:
            print("Failed to sync knowledge base. Check your GOOGLE_API_KEY.")

except Exception as e:
    print(f"Error during execution: {e}")
