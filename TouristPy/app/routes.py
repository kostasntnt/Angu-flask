from flask import Blueprint, request, jsonify 
from app import db 
from flask_cors import cross_origin

routes = Blueprint('routes', __name__)

@routes.route('/signup', methods=['POST'])
@cross_origin(origin='http://localhost:4200', supports_credentials=True)
def signup():
    data =request.json

    firstname =data.get("firstname")
    lastname =data.get("lastname")
    email =data.get("email")
    username =data.get("username")
    password =data.get("password")


    if not firstname or not lastname or not email or not username or not password:
        return jsonify({"error": "Missing fields"}), 400

    db.users.insert_one({
        "firstname": firstname,
        "lastname": lastname,
        "email": email,
        "username": username,
        "password": password

    })

    print("Λήφθηκε αίτημα εγγραφής:", request.json)
    return jsonify({"message": "User created successfully"}), 201