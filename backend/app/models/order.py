from app import db
from datetime import datetime

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    chef_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    delivery_person_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    status = db.Column(db.String(30), default='CREATED', nullable=False)
    
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    discount_amount = db.Column(db.Numeric(10, 2), default=0.00)
    delivery_fee = db.Column(db.Numeric(10, 2), default=5.00)
    total = db.Column(db.Numeric(10, 2), nullable=False)
    
    order_time = db.Column(db.DateTime, default=datetime.utcnow)
    delivery_time = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')
    chef = db.relationship('User', foreign_keys=[chef_id], backref='chef_orders')
    delivery_person = db.relationship('User', foreign_keys=[delivery_person_id], backref='delivery_orders')
    transaction = db.relationship('Transaction', backref='order', uselist=False, lazy=True)
    
    def calculate_total(self, is_vip=False, vip_orders_count=0):
        """Calculate order total with VIP discounts"""
        total = self.subtotal
        
        if is_vip:
            discount = self.subtotal * 0.05
            self.discount_amount = discount
            total -= discount
        
        if is_vip and vip_orders_count > 0 and vip_orders_count % 3 == 0:
            self.delivery_fee = 0.00
        
        total += self.delivery_fee
        self.total = total
        return total
    
    def __repr__(self):
        return f'<Order #{self.id} customer={self.customer_id} status={self.status}>'


class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    dish_id = db.Column(db.Integer, db.ForeignKey('dishes.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    price_at_time = db.Column(db.Numeric(10, 2), nullable=False)
    
    def __repr__(self):
        return f'<OrderItem order={self.order_id} dish={self.dish_id} qty={self.quantity}>'