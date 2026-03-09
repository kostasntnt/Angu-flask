from flask import Flask
from flask_cors import CORS
from config import Config
from .db import db
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # JWT Ρυθμίσεις - Καλό είναι να παίρνει το secret από το .env
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "super-secret-key-that-is-at-least-32-characters-long-12345")
    jwt = JWTManager(app)
    
    # Ρύθμιση CORS - ΕΔΩ ΕΙΝΑΙ Η ΑΛΛΑΓΗ
    # Προσθέτουμε allow_headers για να δέχεται το Authorization και το Content-Type
    CORS(app, supports_credentials=True, resources={
        r"/*": {
            "origins": ["http://localhost:4200"],
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    })

    # Εγγραφή των Blueprints
    from .routes import routes as routes_blueprint
    app.register_blueprint(routes_blueprint)

    return app