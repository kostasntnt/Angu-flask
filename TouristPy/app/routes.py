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
geolocator = Nominatim(user_agent="my_travel_app_final_version_2024")

# --- ΒΟΗΘΗΤΙΚΗ ΣΥΝΑΡΤΗΣΗ ΓΙΑ ΤΑ ΚΟΣΤΗ ---
def safe_int(val):
    """Μετατρέπει με ασφάλεια οποιαδήποτε τιμή AI σε ακέραιο αριθμό"""
    if isinstance(val, dict):
        vals = list(val.values())
        return safe_int(vals[0]) if vals else 0
    try:
        clean_str = str(val).replace('€', '').replace('$', '').replace(',', '').strip()
        return int(float(clean_str))
    except (ValueError, TypeError):
        return 0

# --- 1. GENERATE TRIP LOGIC ---
def logic_generate_trip():
    current_user = "guest"
    try:
        verify_jwt_in_request(optional=True)
        current_user = get_jwt_identity() or "guest"
    except Exception:
        pass 

    data = request.get_json(silent=True) or {}
    raw_location = data.get("location") or data.get("query") or "Άγνωστος Προορισμός"
    days_count = data.get("days", 3)
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Είσαι επαγγελματίας ταξιδιωτικός σχεδιαστής. Απάντησε ΑΠΟΚΛΕΙΣΤΙΚΑ σε JSON στα Ελληνικά."},
                {"role": "user", "content": f"Σχεδίασε ταξίδι για {raw_location} ({days_count} μέρες). Δομή: {{\"title\": \"\", \"location\": \"\", \"days\": [ {{\"day\": 1, \"activities\": [], \"tips\": \"\"}} ] }}"}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        
        ai_response = json.loads(chat_completion.choices[0].message.content)
        
        if "days" not in ai_response or not isinstance(ai_response["days"], list):
            ai_response["days"] = ai_response.get("itinerary", [])

        trip_doc = {
            "username": current_user,
            "location": ai_response.get("location") or raw_location,
            "days_count": days_count,
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
        return jsonify({"error": str(e), "days": []}), 500

# --- 2. CALCULATE COSTS (Η ΠΛΗΡΗΣ ΔΙΟΡΘΩΜΕΝΗ ΕΚΔΟΣΗ) ---
@routes.route('/calculate-costs', methods=['POST', 'OPTIONS'])
def calculate_costs():
    if request.method == 'OPTIONS': 
        return make_response("", 200)
    
    try:
        data = request.get_json(silent=True) or {}
        origin = data.get('origin', 'Αθήνα') 
        location = data.get('location', 'Άγνωστος Προορισμός')
        days = int(data.get('days', 1))
        people = int(data.get('people', 1))
        transport_type = data.get('transportType', 'car')
        
        distance_km = 0
        try:
            loc1 = geolocator.geocode(origin)
            loc2 = geolocator.geocode(location)
            if loc1 and loc2:
                distance_km = round(geodesic((loc1.latitude, loc1.longitude), (loc2.latitude, loc2.longitude)).km * 1.2)
        except: pass

        # Υπολογισμός καυσίμων και διοδίων (Backend logic)
        fuel_cost = round((distance_km / 100) * 8 * 1.90) if transport_type == 'car' else 0
        tolls_cost = round(distance_km * 0.05) if transport_type == 'car' and distance_km > 80 else 0
        total_transport = fuel_cost + tolls_cost
        
        prompt = f"""
        Υπολόγισε τα έξοδα για ένα ταξίδι στο μέρος: {location}, για {days} μέρες και {people} άτομα.
        Επίστρεψε ΑΠΟΚΛΕΙΣΤΙΚΑ ένα JSON αντικείμενο με την εξής δομή:
        {{
            "accommodation": 150,
            "daily_expenses": 100,
            "activities": 50
        }}
        ΠΡΟΣΟΧΗ: Μόνο αριθμοί.
        """
        
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a travel budget calculator. Output ONLY raw JSON data."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )

        ai_res = json.loads(chat_completion.choices[0].message.content)

        acc = safe_int(ai_res.get('accommodation', 0))
        exp = safe_int(ai_res.get('daily_expenses', 0))
        act = safe_int(ai_res.get('activities', 0))
        
        # Εδώ χτίζουμε το JSON που περιμένει το Angular (συμπεριλαμβανομένου του transport_details)
        final_response = {
            "accommodation": acc,
            "daily_expenses": exp,
            "activities": act,
            "distance_km": distance_km,
            "transport": total_transport,
            "transport_details": {
                "fuel": fuel_cost,
                "tolls": tolls_cost
            },
            "total": acc + exp + act + total_transport,
            "attractions_list": [
                {"name": "Ξενοδοχεία & Διαμονή", "price": acc},
                {"name": "Φαγητό & Αναψυχή", "price": exp},
                {"name": "Αξιοθέατα & Δραστηριότητες", "price": act}
            ]
        }
        
        return jsonify(final_response), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- 3. NEARBY RECOMMENDATIONS ---
@routes.route('/nearby-recommendations', methods=['POST', 'OPTIONS'])
def nearby_recommendations():
    if request.method == 'OPTIONS': return make_response("", 200)
    
    default_suggestions = [
        {"place": "Ναύπλιο", "distance": "140 χλμ", "reason": "Ιστορική πόλη."},
        {"place": "Χαλκίδα", "distance": "80 χλμ", "reason": "Θαλασσινά."},
        {"place": "Λουτράκι", "distance": "85 χλμ", "reason": "Ιαματικά λουτρά."}
    ]

    try:
        data = request.get_json(silent=True) or {}
        lat, lng = data.get('lat'), data.get('lng')
        user_city = "Αθήνα"
        if lat and lng:
            try:
                location_raw = geolocator.reverse(f"{lat}, {lng}", language='el')
                if location_raw:
                    user_city = location_raw.raw.get('address', {}).get('city') or \
                                location_raw.raw.get('address', {}).get('town') or "Αθήνα"
            except: pass

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Απάντησε ΑΠΟΚΛΕΙΣΤΙΚΑ σε JSON."},
                {"role": "user", "content": f"Πρότεινε 4 μέρη κοντά στο {user_city}. JSON: 'nearbySuggestions' (place, distance, reason)."}
            ],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        results = json.loads(chat_completion.choices[0].message.content)
        if "nearbySuggestions" not in results: results["nearbySuggestions"] = default_suggestions
        return jsonify({**results, "user_city": user_city}), 200
    except:
        return jsonify({"nearbySuggestions": default_suggestions, "user_city": "Ελλάδα"}), 200

# --- 4. ΛΟΙΠΑ ROUTES ---
@routes.route('/generate-trip', methods=['POST', 'OPTIONS'])
@routes.route('/generate-custom-trip', methods=['POST', 'OPTIONS'])
def handle_trip_requests():
    if request.method == 'OPTIONS': return make_response("", 200)
    return logic_generate_trip()

@routes.route('/get-my-trips', methods=['GET', 'OPTIONS'])
def get_my_trips():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        verify_jwt_in_request(optional=True)
        current_user = get_jwt_identity()
        if not current_user: return jsonify([]), 200
        trips = list(db.trips.find({"username": current_user}).sort("created_at", -1))
        for t in trips:
            t['_id'] = str(t['_id'])
            t['created_at'] = t['created_at'].isoformat() if 'created_at' in t else ""
        return jsonify(trips), 200
    except: return jsonify([]), 200

@routes.route('/toggle-favorite', methods=['POST', 'OPTIONS'])
def toggle_favorite():
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        data = request.get_json()
        trip_id = data.get("trip_id") or data.get("_id")
        trip = db.trips.find_one({"_id": ObjectId(trip_id)})
        new_status = not trip.get("is_favorite", False)
        db.trips.update_one({"_id": ObjectId(trip_id)}, {"$set": {"is_favorite": new_status}})
        return jsonify({"message": "OK", "is_favorite": new_status}), 200
    except: return jsonify({"error": "Fail"}), 500

@routes.route('/signup', methods=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS': return make_response("", 200)
    data = request.get_json()
    data['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.users.insert_one(data)
    return jsonify({"msg": "ok"}), 201

@routes.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS': return make_response("", 200)
    data = request.get_json()
    user = db.users.find_one({"username": data['username']})
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({"token": create_access_token(identity=user['username']), "username": user['username']}), 200
    return jsonify({"err": "unauthorized"}), 401

@routes.route('/delete-trip/<trip_id>', methods=['DELETE', 'OPTIONS'])
def delete_trip(trip_id):
    if request.method == 'OPTIONS': return make_response("", 200)
    try:
        verify_jwt_in_request()
        db.trips.delete_one({"_id": ObjectId(trip_id), "username": get_jwt_identity()})
        return jsonify({"message": "Deleted"}), 200
    except: return jsonify({"error": "fail"}), 500