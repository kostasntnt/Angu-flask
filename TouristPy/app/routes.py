from flask import Blueprint, request, jsonify, make_response
from app.db import db
import bcrypt
import os
import json
import traceback
from groq import Groq
from geopy.geocoders import Nominatim
from geopy.distance import geodesic 
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv
from flask_jwt_extended import (
    create_access_token, 
    verify_jwt_in_request, 
    get_jwt_identity,
    jwt_required
)

load_dotenv()

routes = Blueprint('routes', __name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# --- CORS SETTINGS ---
@routes.after_request
def add_cors_headers(response):
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:4200')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    return response

# --- CORE LOGIC ---
def logic_generate_trip():
    current_user = "guest"
    try:
        verify_jwt_in_request(optional=True)
        current_user = get_jwt_identity() or "guest"
    except Exception:
        pass 

    data = request.get_json(silent=True) or {}
    raw_location = data.get("location") or data.get("query") or "Άγνωστος Προορισμός"
    days = data.get("days", 3)
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Είσαι επαγγελματίας ταξιδιωτικός σχεδιαστής. Απάντησε ΑΠΟΚΛΕΙΣΤΙΚΑ σε JSON στα Ελληνικά."},
                {"role": "user", "content": f"Σχεδίασε ταξίδι για {raw_location} ({days} μέρες). Δομή: {{\"title\": \"\", \"location\": \"\", \"days\": [ {{\"day\": 1, \"activities\": [], \"tips\": \"\"}} ] }}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        
        ai_response = json.loads(chat_completion.choices[0].message.content)
        final_location = ai_response.get("location") or raw_location

        trip_doc = {
            "username": current_user,
            "location": final_location,
            "days_count": days,
            "trip_data": ai_response,
            "is_favorite": False,
            "created_at": datetime.utcnow()
        }

        result = db.trips.insert_one(trip_doc)
        ai_response["_id"] = str(result.inserted_id)
        ai_response["is_favorite"] = False
        ai_response["created_at"] = trip_doc["created_at"].isoformat()
        
        return jsonify(ai_response), 200
    except Exception as e: 
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- ROUTES ---

@routes.route('/generate-trip', methods=['POST', 'OPTIONS'])
@routes.route('/generate-custom-trip', methods=['POST', 'OPTIONS'])
def handle_trip_requests():
    if request.method == 'OPTIONS': return make_response("", 200)
    return logic_generate_trip()

@routes.route('/toggle-favorite', methods=['POST', 'OPTIONS'])
def toggle_favorite():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        verify_jwt_in_request()
        data = request.get_json(silent=True) or {}
        trip_id = data.get("trip_id") or data.get("_id")
        
        if not trip_id:
            return jsonify({"error": "No trip_id provided"}), 400
        
        trip = db.trips.find_one({"_id": ObjectId(trip_id)})
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        
        new_status = not trip.get("is_favorite", False)
        db.trips.update_one({"_id": ObjectId(trip_id)}, {"$set": {"is_favorite": new_status}})
        
        return jsonify({"message": "Updated", "is_favorite": new_status}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@routes.route('/get-my-trips', methods=['GET', 'OPTIONS'])
def get_my_trips():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        verify_jwt_in_request()
        current_user = get_jwt_identity()
        
        # Αναζήτηση και μετατροπή σε λίστα
        trips = list(db.trips.find({"username": current_user}).sort("created_at", -1))
        
        for t in trips:
            t['_id'] = str(t['_id'])
            # Ασφαλής μετατροπή ημερομηνίας
            if 'created_at' in t and isinstance(t['created_at'], datetime):
                t['created_at'] = t['created_at'].isoformat()
            else:
                t['created_at'] = datetime.utcnow().isoformat()
        
        return jsonify(trips), 200
    except Exception as e:
        print("ERROR in get-my-trips:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@routes.route('/nearby-recommendations', methods=['POST', 'OPTIONS'])
def nearby_recommendations():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        verify_jwt_in_request()
        data = request.get_json(silent=True) or {}
        lat, lng = data.get('lat'), data.get('lng')
        
        geolocator = Nominatim(user_agent="travel_app_v10")
        location_raw = geolocator.reverse(f"{lat}, {lng}", language='el')
        address = location_raw.raw.get('address', {})
        user_city = address.get('city') or address.get('town') or address.get('village') or "Άγνωστη περιοχή"
        
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Είσαι GPS Tracker. Απάντησε ΜΟΝΟ JSON."},
                {"role": "user", "content": f"Πρότεινε 6 μέρη κοντά στο {user_city}. Structure: {{\"suggestions\": [ {{\"place\": \"\", \"reason\": \"\", \"lat\": 0.0, \"lng\": 0.0}} ] }}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        
        results = json.loads(chat_completion.choices[0].message.content)
        user_coords = (lat, lng)
        for item in results.get('suggestions', []):
            try:
                item_coords = (item.get('lat', 0), item.get('lng', 0))
                item['distance'] = f"{round(geodesic(user_coords, item_coords).km, 1)} χλμ"
            except: item['distance'] = "N/A"
                
        return jsonify({**results, "user_city": user_city}), 200
    except Exception as e: 
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@routes.route('/signup', methods=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        data = request.get_json(silent=True) or {}
        if db.users.find_one({"username": data.get("username")}):
            return jsonify({"error": "User exists"}), 400
            
        hashed = bcrypt.hashpw(data.get("password", "").encode('utf-8'), bcrypt.gensalt())
        db.users.insert_one({**data, "password": hashed.decode('utf-8')})
        return jsonify({"message": "User created"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@routes.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        data = request.get_json(silent=True) or {}
        user = db.users.find_one({"username": data.get("username")})
        if user and bcrypt.checkpw(data.get("password", "").encode('utf-8'), user["password"].encode('utf-8')):
            # Διασφάλιση ότι το identity είναι string
            token = create_access_token(identity=str(user["username"]))
            return jsonify({"token": token, "username": user["username"]}), 200
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500