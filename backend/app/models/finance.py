from app import db
from datetime import datetime

class Wallet(db.Model):
    __tablename__ = 'wallets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    balance = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions = db.relationship('Transaction', backref='wallet', lazy=True)
    
    def add_funds(self, amount):
        """Add money to wallet"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        self.balance += amount
        self.updated_at = datetime.utcnow()
    
    def deduct_funds(self, amount):
        """Remove money from wallet (for orders)"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        if self.balance < amount:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        self.updated_at = datetime.utcnow()
    
    def has_sufficient_funds(self, amount):
        """Check if wallet has enough money"""
        return self.balance >= amount
    
    def __repr__(self):
        return f'<Wallet user_id={self.user_id} balance=${self.balance}>'


class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallets.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # 'deposit', 'payment', 'refund'
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Transaction {self.transaction_type} ${self.amount}>'