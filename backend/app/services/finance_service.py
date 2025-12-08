from datetime import datetime
from firebase_admin import firestore

from app.firebase_client import get_firestore


class FinanceService:
    """
    Finance logic backed by Firestore, sharing the same data model as the frontend:
      - User "wallet" balance is stored in `users/{userId}.deposit`
      - Transactions are stored in a top-level `transactions` collection
    """

    @staticmethod
    def _users_col():
        return get_firestore().collection("users")

    @staticmethod
    def _tx_col():
        return get_firestore().collection("transactions")

    # Public API ---------------------------------------------------------

    @staticmethod
    def get_wallet(user_id: str):
        """
        Get a user's wallet as a simple dict:
        { "user_id": <uid>, "balance": <float> }
        """
        doc_ref = FinanceService._users_col().document(user_id)
        snap = doc_ref.get()
        if not snap.exists:
            raise ValueError(f"User {user_id} not found in Firestore")

        data = snap.to_dict() or {}
        balance = float(data.get("deposit", 0))
        return {"user_id": user_id, "balance": balance}

    @staticmethod
    def add_funds(user_id: str, amount: float, description: str = "Deposit"):
        """
        Add money to the user's wallet (deposit) and record a transaction.
        """
        if amount <= 0:
            raise ValueError("Amount must be positive")

        return FinanceService._change_balance(
            user_id=user_id,
            delta=abs(float(amount)),
            tx_type="deposit",
            description=description,
            order_id=None,
        )

    @staticmethod
    def process_payment(
        user_id: str,
        order_id: str,
        amount: float,
        description: str = "Order payment",
    ):
        """
        Deduct money from the user's wallet for an order (payment).
        Raises ValueError if insufficient funds.
        """
        if amount <= 0:
            raise ValueError("Amount must be positive")

        # Negative delta → reduce balance
        return FinanceService._change_balance(
            user_id=user_id,
            delta=-abs(float(amount)),
            tx_type="payment",
            description=description,
            order_id=order_id,
        )

    @staticmethod
    def process_refund(
        user_id: str,
        order_id: str,
        amount: float,
        description: str = "Refund",
    ):
        """
        Refund money to the user's wallet and record a transaction.
        """
        if amount <= 0:
            raise ValueError("Amount must be positive")

        return FinanceService._change_balance(
            user_id=user_id,
            delta=abs(float(amount)),
            tx_type="refund",
            description=description,
            order_id=order_id,
        )

    @staticmethod
    def get_transaction_history(user_id: str, limit: int = 50):
        """
        Get recent transaction history for a user from Firestore.
        Returns a list of dicts with:
          { id, amount, transaction_type, description, created_at }
        """
        q = (
            FinanceService._tx_col()
            .where("userId", "==", user_id)
            .order_by("createdAt", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )

        snap = q.get()
        results = []

        for doc in snap:
            data = doc.to_dict() or {}
            created_at = data.get("createdAt")
            # Firestore timestamp → Python datetime
            if hasattr(created_at, "to_datetime"):
                created_at = created_at.to_datetime()
            elif created_at is None:
                created_at = datetime.utcnow()

            results.append(
                {
                    "id": doc.id,
                    "amount": float(data.get("amount", 0)),
                    "transaction_type": data.get("type", ""),
                    "description": data.get("description", ""),
                    "created_at": created_at,
                }
            )

        return results

    # Internal helpers ---------------------------------------------------

    @staticmethod
    def _change_balance(
        user_id: str,
        delta: float,
        tx_type: str,
        description: str,
        order_id: str | None,
    ):
        """
        Apply a balance change (delta) for a user in a Firestore transaction.
        delta > 0  → add funds
        delta < 0  → deduct funds (fails if insufficient)
        """
        db = get_firestore()
        user_ref = FinanceService._users_col().document(user_id)

        @firestore.transactional
        def _op(transaction: firestore.Transaction):
            snap = user_ref.get(transaction=transaction)
            if not snap.exists:
                raise ValueError(f"User {user_id} not found in Firestore")

            data = snap.to_dict() or {}
            old_balance = float(data.get("deposit", 0))
            new_balance = old_balance + float(delta)

            if new_balance < 0:
                # Do not write anything if insufficient funds
                raise ValueError("Insufficient funds")

            # Update user's deposit
            transaction.update(
                user_ref,
                {
                    "deposit": new_balance,
                    "updatedAt": firestore.SERVER_TIMESTAMP,
                },
            )

            # Create a transaction record
            tx_ref = FinanceService._tx_col().document()
            tx_data = {
                "userId": user_id,
                "orderId": order_id,
                "amount": float(abs(delta)),
                "type": tx_type,
                "description": description,
                "createdAt": firestore.SERVER_TIMESTAMP,
            }
            transaction.set(tx_ref, tx_data)

            # Return simple Python-friendly structures
            wallet = {"user_id": user_id, "balance": new_balance}
            tx_info = {
                "id": tx_ref.id,
                "amount": float(abs(delta)),
                "transaction_type": tx_type,
                "description": description,
                "created_at": datetime.utcnow(),
            }
            return wallet, tx_info

        tx = db.transaction()
        return _op(tx)