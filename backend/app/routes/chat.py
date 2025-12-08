from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from firebase_admin import firestore

from app.firebase_client import get_firestore
from app.services.llm import ChatService

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/ask", methods=["POST"])
def ask():
    data = request.get_json() or {}
    message = data.get("message")

    if not message:
        return jsonify({"error": "Message is required"}), 400

    service = ChatService.get_instance()
    result = service.get_response(message)

    # result is a dict: { text, source, kbIds }
    return jsonify(result), 200


@chat_bp.route("/rate", methods=["POST"])
@jwt_required(optional=True)
def rate_response():
    """
    Store a user rating for a chatbot response.
    Rating 0 (outrageous) is flagged for manager review.
    """
    data = request.get_json() or {}

    rating = data.get("rating")
    if rating is None:
        return jsonify({"success": False, "error": "rating is required"}), 400

    try:
        rating_value = int(rating)
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "rating must be an integer"}), 400

    user_id = get_jwt_identity()
    question = data.get("question", "")
    response_text = data.get("response", "")
    source = data.get("source", "")
    kb_ids = data.get("kbIds") or []

    db_fs = get_firestore()
    target_dish_ids = []
    target_chef_ids = []

    # Resolve KB document IDs (which correspond to dishes) into chefs
    if kb_ids:
        dishes_col = db_fs.collection("dishes")
        for kb_id in kb_ids:
            try:
                snap = dishes_col.document(str(kb_id)).get()
                if not snap.exists:
                    continue
                data_doc = snap.to_dict() or {}
                target_dish_ids.append(snap.id)
                chef_id = data_doc.get("chefId")
                if chef_id:
                    target_chef_ids.append(chef_id)
            except Exception as e:  # pragma: no cover - defensive
                print(f"Failed to resolve KB id {kb_id} to dish/chef: {e}")

    doc = {
        "userId": user_id,
        "question": question,
        "response": response_text,
        "rating": rating_value,
        "source": source,
        "kbIds": kb_ids,
        "targetDishIds": target_dish_ids,
        "targetChefIds": target_chef_ids,
        "needsManagerReview": rating_value == 0,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    db_fs.collection("chat_ratings").add(doc)

    return jsonify({"success": True}), 200


@chat_bp.route("/sync", methods=["POST"])
@jwt_required()
def sync_knowledge_base():
    # Ideally check for admin role here
    service = ChatService.get_instance()
    success = service.sync_knowledge_base()

    if success:
        return jsonify({"message": "Knowledge base synced successfully"})
    else:
        return jsonify({"error": "Failed to sync knowledge base"}), 500
