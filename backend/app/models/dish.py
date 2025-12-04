from app import db
from datetime import datetime

class Dish(db.Model):
    __tablename__ = 'dishes'
    
    id = db.Column(db.Integer, primary_key=True)
    chef_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    image_url = db.Column(db.String(255))
    is_vip_only = db.Column(db.Boolean, default=False)
    is_available = db.Column(db.Boolean, default=True)
    avg_rating = db.Column(db.Numeric(3, 2), default=0.00)
    total_orders = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    chef = db.relationship('User', backref='dishes', foreign_keys=[chef_id])
    order_items = db.relationship('OrderItem', backref='dish', lazy=True)
    
    def __repr__(self):
        return f'<Dish {self.name} ${self.price}>'