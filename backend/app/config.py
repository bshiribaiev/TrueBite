import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, "instance", "truebite.db")


class Config:
    # Database
    # Use DATABASE_URL if provided, otherwise fall back to local SQLite file
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{DEFAULT_SQLITE_PATH}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-session-key')
    DEBUG = os.getenv('FLASK_ENV') == 'development'

    # AI
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')