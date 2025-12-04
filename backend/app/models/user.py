from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    user_type = db.Column(db.String(20), nullable=False)  # 'customer', 'vip', 'chef', 'delivery', 'manager'
    is_blacklisted = db.Column(db.Boolean, default=False)
    warnings_count = db.Column(db.Integer, default=0)
    total_spent = db.Column(db.Numeric(10, 2), default=0.00)
    order_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    wallet = db.relationship('Wallet', backref='user', uselist=False, lazy=True)
    orders = db.relationship('Order', backref='customer', lazy=True, foreign_keys='Order.customer_id')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_vip(self):
        return self.user_type == 'vip'
    
    def __repr__(self):
        return f'<User {self.email} ({self.user_type})>'