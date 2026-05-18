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

    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 Megabytes όριο
    
# Πλήρης ρύθμιση CORS
    # Το κλειδί εδώ είναι το 'expose_headers' ώστε η Angular να μπορεί να διαβάσει το Token αν χρειαστεί
    CORS(app, 
         resources={r"/*": {"origins": "http://localhost:4200"}}, 
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         expose_headers=["Authorization"])

    # Απενεργοποίηση του strict_slashes για να μην έχουμε 301/404 redirects που σπάνε το CORS
    app.url_map.strict_slashes = False

    # JWT Ρύθμιση
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "super-secret-key-12345")
    jwt = JWTManager(app)
    
    # Εγγραφή των Blueprints ΠΡΙΝ το CORS (για να εφαρμοστεί σωστά σε όλα τα routes)
    from .routes import routes as routes_blueprint
    app.register_blueprint(routes_blueprint)

    

    return app