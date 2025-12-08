import os

import firebase_admin
from firebase_admin import credentials, firestore

_firestore_client = None

# Base directory for the backend (one level up from app/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Default service account path (the JSON you added under backend/)
DEFAULT_SERVICE_ACCOUNT_PATH = os.path.join(
    BASE_DIR, "truebite-csc-firebase-adminsdk-fbsvc-6311932c04.json"
)


def get_firestore():
    """Return a singleton Firestore client using Firebase Admin SDK."""
    global _firestore_client

    if _firestore_client is not None:
        return _firestore_client

    if not firebase_admin._apps:
        # 1) Prefer explicit env var
        cred_path = os.getenv("FIREBASE_CREDENTIALS") or os.getenv(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )

        if cred_path:
            cred = credentials.Certificate(cred_path)
        elif os.path.exists(DEFAULT_SERVICE_ACCOUNT_PATH):
            # 2) Fall back to the JSON you added in backend/
            cred = credentials.Certificate(DEFAULT_SERVICE_ACCOUNT_PATH)
        else:
            # 3) Finally, fall back to application default credentials
            cred = credentials.ApplicationDefault()

        firebase_admin.initialize_app(cred)

    _firestore_client = firestore.client()
    return _firestore_client