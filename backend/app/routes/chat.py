from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.llm import ChatService

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()
    message = data.get('message')
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
        
    service = ChatService.get_instance()
    response = service.get_response(message)
    
    return jsonify({'response': response})

@chat_bp.route('/sync', methods=['POST'])
@jwt_required()
def sync_knowledge_base():
    # Ideally check for admin role here
    service = ChatService.get_instance()
    success = service.sync_knowledge_base()
    
    if success:
        return jsonify({'message': 'Knowledge base synced successfully'})
    else:
        return jsonify({'error': 'Failed to sync knowledge base'}), 500

