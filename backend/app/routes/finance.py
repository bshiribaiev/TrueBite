# backend/app/routes/finance.py
from flask import Blueprint, request, jsonify
from app.services.finance_service import FinanceService
from flask_jwt_extended import jwt_required, get_jwt_identity

finance_bp = Blueprint('finance', __name__)

@finance_bp.route('/balance', methods=['GET'])
@jwt_required()
def get_balance():
    """Get current wallet balance"""
    try:
        user_id = get_jwt_identity()
        wallet = FinanceService.get_wallet(user_id)
        
        return jsonify({
            'success': True,
            'balance': float(wallet.balance)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

@finance_bp.route('/deposit', methods=['POST'])
@jwt_required()
def add_funds():
    """Add funds to wallet"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        amount = data.get('amount')
        if not amount:
            return jsonify({'success': False, 'error': 'Amount required'}), 400
        
        amount = float(amount)
        wallet, transaction = FinanceService.add_funds(user_id, amount)
        
        return jsonify({
            'success': True,
            'balance': float(wallet.balance),
            'transaction': {
                'id': transaction.id,
                'amount': float(transaction.amount),
                'type': transaction.transaction_type,
                'created_at': transaction.created_at.isoformat()
            }
        }), 200
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': 'Server error'}), 500

@finance_bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    """Get transaction history"""
    try:
        user_id = get_jwt_identity()
        limit = request.args.get('limit', 50, type=int)
        
        transactions = FinanceService.get_transaction_history(user_id, limit)
        
        return jsonify({
            'success': True,
            'transactions': [{
                'id': t.id,
                'amount': float(t.amount),
                'type': t.transaction_type,
                'description': t.description,
                'created_at': t.created_at.isoformat()
            } for t in transactions]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@finance_bp.route('/refund', methods=['POST'])
@jwt_required()
def process_refund():
    """Process refund (manager only)"""
    try:
        data = request.get_json()
        
        user_id = data.get('user_id')
        order_id = data.get('order_id')
        amount = float(data.get('amount'))
        
        wallet, transaction = FinanceService.process_refund(user_id, order_id, amount)
        
        return jsonify({
            'success': True,
            'balance': float(wallet.balance),
            'transaction_id': transaction.id
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400