from flask import Blueprint, request, jsonify
from app.services.order_service import OrderService
from flask_jwt_extended import jwt_required, get_jwt_identity

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/create', methods=['POST'])
@jwt_required()
def create_order():
    """Create a new order"""
    try:
        customer_id = get_jwt_identity()
        data = request.get_json()
        
        cart_items = data.get('items')
        if not cart_items:
            return jsonify({'success': False, 'error': 'Cart is empty'}), 400
        
        order = OrderService.create_order(customer_id, cart_items)
        
        return jsonify({
            'success': True,
            'order': {
                'id': order.id,
                'status': order.status,
                'subtotal': float(order.subtotal),
                'discount': float(order.discount_amount),
                'delivery_fee': float(order.delivery_fee),
                'total': float(order.total),
                'order_time': order.order_time.isoformat(),
                'items': [{
                    'dish_id': item.dish_id,
                    'quantity': item.quantity,
                    'price': float(item.price_at_time)
                } for item in order.items]
            }
        }), 201
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': 'Server error'}), 500

@orders_bp.route('/history', methods=['GET'])
@jwt_required()
def get_order_history():
    """Get customer's order history"""
    try:
        customer_id = get_jwt_identity()
        limit = request.args.get('limit', 50, type=int)
        
        orders = OrderService.get_customer_orders(customer_id, limit)
        
        return jsonify({
            'success': True,
            'orders': [{
                'id': o.id,
                'status': o.status,
                'total': float(o.total),
                'order_time': o.order_time.isoformat(),
                'items_count': len(o.items)
            } for o in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@orders_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """Get order details"""
    try:
        order = OrderService.get_order(order_id)
        
        return jsonify({
            'success': True,
            'order': {
                'id': order.id,
                'status': order.status,
                'subtotal': float(order.subtotal),
                'discount': float(order.discount_amount),
                'delivery_fee': float(order.delivery_fee),
                'total': float(order.total),
                'order_time': order.order_time.isoformat(),
                'items': [{
                    'dish_id': item.dish_id,
                    'dish_name': item.dish.name,
                    'quantity': item.quantity,
                    'price': float(item.price_at_time)
                } for item in order.items]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 404

@orders_bp.route('/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    """Update order status (chef/delivery use this)"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        order = OrderService.update_order_status(order_id, new_status)
        
        return jsonify({
            'success': True,
            'order_id': order.id,
            'status': order.status
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400