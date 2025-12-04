import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/truebite')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-session-key')
    DEBUG = os.getenv('FLASK_ENV') == 'development'

    # AI
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')