from flask import Blueprint, request, jsonify
from app.db import db
from flask_cors import cross_origin
import bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import os
import json
from groq import Groq
from geopy.geocoders import Nominatim
from geopy.distance import geodesic 

routes = Blueprint('routes', __name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# --- AUTH ROUTES ---
@routes.route('/signup', methods=['POST', 'OPTIONS'])
@cross_origin(origins='http://localhost:4200', supports_credentials=True)
def signup():
    if request.method == 'OPTIONS': return jsonify({"status": "ok"}), 200
    try:
        data = request.json
        if db.users.find_one({"username": data.get("username")}):
            return jsonify({"error": "User already exists"}), 400
        hashed = bcrypt.hashpw(data.get("password").encode('utf-8'), bcrypt.gensalt())
        db.users.insert_one({**data, "password": hashed.decode('utf-8')})
        return jsonify({"message": "User created"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500

@routes.route('/login', methods=['POST', 'OPTIONS'])
@cross_origin(origins='http://localhost:4200', supports_credentials=True)
def login():
    if request.method == 'OPTIONS': return jsonify({"status": "ok"}), 200
    data = request.json
    user = db.users.find_one({"username": data.get("username")})
    if user and bcrypt.checkpw(data.get("password").encode('utf-8'), user["password"].encode('utf-8')):
        token = create_access_token(identity=str(data.get("username")))
        return jsonify({"token": token, "username": data.get("username")}), 200
    return jsonify({"error": "Invalid credentials"}), 401

# --- NEARBY RECOMMENDATIONS (FIXED IMAGES & DISTANCE) ---
@routes.route('/nearby-recommendations', methods=['POST', 'OPTIONS'])
@cross_origin(origins='http://localhost:4200', supports_credentials=True)
@jwt_required()
def nearby_recommendations():
    if request.method == 'OPTIONS': return jsonify({"status": "ok"}), 200
    
    data = request.json
    user_lat, user_lng = data.get('lat'), data.get('lng')

    try:
        geolocator = Nominatim(user_agent="travel_app_v6")
        location = geolocator.reverse(f"{user_lat}, {user_lng}", language='el')
        user_city = location.raw.get('address', {}).get('city') or "Πρέβεζα"
    except:
        user_city = "Πρέβεζα"

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Είσαι GPS Tracker και Τουριστικός Οδηγός. Πρότεινε 6 ΠΡΑΓΜΑΤΙΚΑ μέρη στην Ελλάδα. Δώσε τις ΠΡΑΓΜΑΤΙΚΕΣ γεωγραφικές συντεταγμένες (decimal). Απάντησε ΜΟΝΟ σε JSON."},
                {"role": "user", "content": f"Βρίσκομαι στο: {user_city} ({user_lat}, {user_lng}). Πρότεινε 6 προορισμούς σε ακτίνα 80χλμ. Δομή: {{\"suggestions\": [ {{\"place\": \"\", \"reason\": \"\", \"lat\": 0.0, \"lng\": 0.0}} ] }}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        
        results = json.loads(chat_completion.choices[0].message.content)
        
        # Υπολογισμός ΠΡΑΓΜΑΤΙΚΗΣ απόστασης και Seed για εικόνα
        user_coords = (user_lat, user_lng)
        for i, item in enumerate(results['suggestions']):
            dest_coords = (item['lat'], item['lng'])
            dist_km = geodesic(user_coords, dest_coords).km
            item['distance'] = f"{round(dist_km, 1)} χλμ"
            # Δημιουργία ενός μοναδικού ID για κάθε εικόνα βασισμένο στο όνομα
            item['img_id'] = sum(ord(c) for c in item['place']) % 1000

        return jsonify({**results, "user_city": user_city}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- AI TRIP GENERATOR ---
@routes.route('/generate-trip', methods=['POST', 'OPTIONS'])
@cross_origin(origins='http://localhost:4200', supports_credentials=True)
@jwt_required()
def generate_trip():
    if request.method == 'OPTIONS': return jsonify({"status": "ok"}), 200
    user_query = request.json.get("query")
    current_user = get_jwt_identity()
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Είσαι ταξιδιωτικός πράκτορας. JSON στα Ελληνικά."},
                {"role": "user", "content": f"3ήμερο πρόγραμμα για: {user_query}. Δομή: {{\"title\": \"\", \"location\": \"\", \"days\": [ {{\"day\": 1, \"activities\": [], \"tips\": \"\"}} ] }}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        trip_data = json.loads(chat_completion.choices[0].message.content)
        trip_data["created_by"] = current_user
        inserted = db.trips.insert_one(trip_data)
        trip_data["_id"] = str(inserted.inserted_id)
        return jsonify(trip_data), 200
    except Exception as e: return jsonify({"error": str(e)}), 500