from flask import Flask  
from flask_cors import CORS  #angular - python diaforetika ports 
from config import Config 
from .db import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)

    from .routes import routes as routes_blueprint
    app.register_blueprint()



    return app