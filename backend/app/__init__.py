from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    jwt.init_app(app)
    
    # Register blueprints
    from app.routes import finance_bp, orders_bp, menu_bp
    app.register_blueprint(finance_bp, url_prefix='/api/finance')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(menu_bp, url_prefix='/api/menu')
    
    @app.route('/')
    def home():
        return {'message': 'TrueBite API is running', 'status': 'success'}
    
    return app