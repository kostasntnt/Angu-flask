from flask import Blueprint, request, jsonify 
from app import db 

routes = Blueprint('routes', __name__)

@routes.route('/signup', mehtods=['POST'])
def signup():
    data =request.jason
    name =data.get("name")
    email =data.get("email")
    password =data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    db.users.insert_one({
        "name": name,
        "email": email,
        "password": password
    })

    return jsonify({"message": "User created successfully"}), 201