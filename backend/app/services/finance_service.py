from app import db
from app.models.finance import Wallet, Transaction
from app.models.user import User
from flask import current_app

class FinanceService:
    
    @staticmethod
    def create_wallet(user_id):
        """Create a wallet for a new user"""
        try:
            wallet = Wallet(user_id=user_id, balance=0.00)
            db.session.add(wallet)
            db.session.commit()
            return wallet
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating wallet: {str(e)}")
            raise
    
    @staticmethod
    def get_wallet(user_id):
        """Get user's wallet"""
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            raise ValueError(f"Wallet not found for user {user_id}")
        return wallet
    
    @staticmethod
    def add_funds(user_id, amount, description="Deposit"):
        """Add money to user's wallet"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        try:
            wallet = FinanceService.get_wallet(user_id)
            wallet.add_funds(amount)
            
            transaction = Transaction(
                wallet_id=wallet.id,
                amount=amount,
                transaction_type='deposit',
                description=description
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            return wallet, transaction
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding funds: {str(e)}")
            raise
    
    @staticmethod
    def process_payment(user_id, order_id, amount, description="Order payment"):
        """Deduct money from wallet for an order"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        try:
            wallet = FinanceService.get_wallet(user_id)
            
            if not wallet.has_sufficient_funds(amount):
                raise ValueError("Insufficient funds")
            
            wallet.deduct_funds(amount)
            
            transaction = Transaction(
                wallet_id=wallet.id,
                order_id=order_id,
                amount=amount,
                transaction_type='payment',
                description=description
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            return wallet, transaction
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error processing payment: {str(e)}")
            raise
    
    @staticmethod
    def process_refund(user_id, order_id, amount, description="Refund"):
        """Refund money to user's wallet"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        try:
            wallet = FinanceService.get_wallet(user_id)
            wallet.add_funds(amount)
            
            transaction = Transaction(
                wallet_id=wallet.id,
                order_id=order_id,
                amount=amount,
                transaction_type='refund',
                description=description
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            return wallet, transaction
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error processing refund: {str(e)}")
            raise
    
    @staticmethod
    def get_transaction_history(user_id, limit=50):
        """Get user's transaction history"""
        wallet = FinanceService.get_wallet(user_id)
        transactions = Transaction.query.filter_by(wallet_id=wallet.id)\
            .order_by(Transaction.created_at.desc())\
            .limit(limit)\
            .all()
        return transactions