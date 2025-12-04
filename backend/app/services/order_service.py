from app import db
from app.models.order import Order, OrderItem
from app.models.dish import Dish
from app.models.user import User
from app.services.finance_service import FinanceService
from flask import current_app

class OrderService:
    
    @staticmethod
    def create_order(customer_id, cart_items):
        """Create a new order from cart items"""
        try:
            customer = User.query.get(customer_id)
            if not customer:
                raise ValueError("Customer not found")
            
            if customer.is_blacklisted:
                raise ValueError("Customer account is restricted")
            
            if not cart_items or len(cart_items) == 0:
                raise ValueError("Cart is empty")
            
            order = Order(customer_id=customer_id)
            subtotal = 0
            
            for item in cart_items:
                dish = Dish.query.get(item['dish_id'])
                if not dish:
                    raise ValueError(f"Dish {item['dish_id']} not found")
                
                if not dish.is_available:
                    raise ValueError(f"Dish '{dish.name}' is not available")
                
                if dish.is_vip_only and not customer.is_vip():
                    raise ValueError(f"Dish '{dish.name}' is VIP-only")
                
                quantity = item.get('quantity', 1)
                if quantity <= 0:
                    raise ValueError("Quantity must be positive")
                
                order_item = OrderItem(
                    order=order,
                    dish_id=dish.id,
                    quantity=quantity,
                    price_at_time=dish.price
                )
                db.session.add(order_item)
                
                subtotal += dish.price * quantity
            
            order.subtotal = subtotal
            
            is_vip = customer.is_vip()
            order.calculate_total(is_vip, customer.order_count)
            
            wallet = FinanceService.get_wallet(customer_id)
            if not wallet.has_sufficient_funds(order.total):
                raise ValueError("Insufficient funds. Please add money to your wallet.")
            
            FinanceService.process_payment(customer_id, None, order.total, f"Order payment")
            
            db.session.add(order)
            db.session.commit()
            
            if order.transaction:
                order.transaction.order_id = order.id
                db.session.commit()
            
            customer.order_count += 1
            customer.total_spent += order.total
            db.session.commit()
            
            return order
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating order: {str(e)}")
            raise
    
    @staticmethod
    def get_order(order_id):
        """Get order by ID"""
        order = Order.query.get(order_id)
        if not order:
            raise ValueError("Order not found")
        return order
    
    @staticmethod
    def get_customer_orders(customer_id, limit=50):
        """Get customer's order history"""
        orders = Order.query.filter_by(customer_id=customer_id)\
            .order_by(Order.order_time.desc())\
            .limit(limit)\
            .all()
        return orders
    
    @staticmethod
    def update_order_status(order_id, new_status):
        """Update order status"""
        valid_statuses = [
            'CREATED', 'IN_KITCHEN', 'READY_FOR_DELIVERY',
            'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
        ]
        
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status: {new_status}")
        
        try:
            order = OrderService.get_order(order_id)
            order.status = new_status
            db.session.commit()
            return order
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating order status: {str(e)}")
            raise