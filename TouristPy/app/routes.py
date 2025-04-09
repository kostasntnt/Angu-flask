from flask import Blueprint, request, jsonify 
from app import db 
from flask_cors import cross_origin
import bcrypt
from flask import session

routes = Blueprint('routes', __name__)

@cross_origin(origins='http://localhost:4200', supports_credentials=True)

@routes.route('/signup', methods=['POST'])
def signup():
    data =request.json

    firstname =data.get("firstname")
    lastname =data.get("lastname")
    email =data.get("email")
    username =data.get("username")
    password =data.get("password")


    if not firstname or not lastname or not email or not username or not password:
        return jsonify({"error": "Missing fields"}), 400
    
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    db.users.insert_one({
        "firstname": firstname,
        "lastname": lastname,
        "email": email,
        "username": username,
        "password": hashed_password.decode('utf-8')

    })

    print("Λήφθηκε αίτημα εγγραφής:", request.json)
    return jsonify({"message": "User created successfully"}), 201


@routes.route('/login',methods=['POST'] )
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error: Συμπληρώστε τα πεδία"}), 400
    
    user =db.users.find_one({"username": username})

    if not user:
        return jsonify({"error":"Λάθος όνομα χρήστη ή κωδικού"}),401
    
    if not bcrypt.checkpw(password.encode('utf-8'), user["password"].encode('utf-8')):
        return jsonify({"error": "Λάθος όνομα χρήστη ή κωδικού"}),401

    return jsonify({"message": "Η σύνδεση ολοκληρώθηκε επιτυχώς", "username": user["username"]}), 200

    
    
    