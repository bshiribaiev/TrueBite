from flask import Blueprint, jsonify
from app.models.dish import Dish

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('/dishes', methods=['GET'])
def get_menu():
    """Get all available dishes"""
    try:
        dishes = Dish.query.filter_by(is_available=True).all()
        
        return jsonify({
            'success': True,
            'dishes': [{
                'id': d.id,
                'name': d.name,
                'description': d.description,
                'price': float(d.price),
                'image_url': d.image_url,
                'is_vip_only': d.is_vip_only,
                'avg_rating': float(d.avg_rating) if d.avg_rating else 0,
                'chef_id': d.chef_id
            } for d in dishes]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500