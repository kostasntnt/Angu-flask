from flask import Flask  
from flask_cors import CORS  #angular - python diaforetika ports 
from config import Config 
from .db import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, supports_credentials=True, resources={r"/*": {"origins": "http://localhost:4200"}})

    from .routes import routes as routes_blueprint
    app.register_blueprint(routes_blueprint)



    return app