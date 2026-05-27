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
import smtplib
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import requests

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


import requests # Σιγουρέψου ότι υπάρχει στην κορυφή

# --- 5. FETCH LOCATION REVIEWS (GOOGLE SEARCH API) ---
@routes.route('/get-location-reviews', methods=['POST', 'OPTIONS'])
def get_location_reviews():
    if request.method == 'OPTIONS': 
        return make_response("", 200)
    
    try:
        data = request.get_json()
        location = data.get('location', 'Athens')
        
        print(f"\n--- API CALL START (Google Search Master Mega) ---")
        print(f"Searching for: {location}")

        # Χρήση του /search endpoint γιατί το /reviews απαιτεί CID
        url = "https://google-search-master-mega.p.rapidapi.com/search"
        querystring = {"query": f"site:tripadvisor.com reviews {location}", "gl": "gr", "hl": "el"}
        
        headers = {
            "x-rapidapi-key": os.getenv("RAPIDAPI_KEY"),
            "x-rapidapi-host": "google-search-master-mega.p.rapidapi.com"
        }

        response = requests.get(url, headers=headers, params=querystring, timeout=10)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            api_data = response.json()
            # Στέλνουμε τα αποτελέσματα (συνήθως στο κλειδί 'results' ή 'organic')
            results = api_data.get('results', api_data.get('organic', []))
            print(f"Success! Found {len(results)} results.")
            return jsonify({"source": "api", "data": results}), 200
        else:
            print(f"API Error: {response.text}. Switching to AI Fallback...")
            raise Exception("RapidAPI Subscription Error")

    except Exception as e:
        print(f"Falling back to AI due to: {str(e)}")
        # FALLBACK ΣΤΟ AI ΓΙΑ ΝΑ ΜΗΝ ΜΕΙΝΕΙ ΑΔΕΙΟΣ Ο ΧΡΗΣΤΗΣ
        prompt = f"Δώσε μου 3 ρεαλιστικές τουριστικές κριτικές για: {location}. JSON format: 'data' list with 'title', 'snippet', 'source' keys."
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"}
        )
        ai_res = json.loads(chat_completion.choices[0].message.content)
        return jsonify({"source": "ai", "data": ai_res.get('data', [])}), 200
    
@routes.route('/save-sequential-trip', methods=['POST', 'OPTIONS'])
def save_sequential_trip():
    # 1. Χειρισμός του Preflight (CORS)
    if request.method == 'OPTIONS': 
        return make_response("", 200)
    
    # 2. Χειρισμός του κανονικού POST
    try:
        # Καλούμε το verify χειροκίνητα για αποφυγή CORS issues
        verify_jwt_in_request() 
        current_user = get_jwt_identity()
        
        data = request.get_json()

        trip_title = data.get("title") or data.get("location") or "Προσαρμοσμένη Διαδρομή"
        
        trip_doc = {
            "username": current_user,
            "location": trip_title,
            "steps": data.get("steps", []),
            "total_distance": data.get("total_distance", 0),
            "is_favorite": True,
            "type": "sequential",
            "created_at": datetime.utcnow()
        }

        result = db.trips.insert_one(trip_doc)
        
        return jsonify({
            "message": "Trip saved successfully",
            "trip_id": str(result.inserted_id)
        }), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
from flask_cors import cross_origin  # <--- Σιγουρέψου ότι αυτό είναι εισαγμένο (ή βάλτο στην κορυφή)

# --- ΑΠΟΣΤΟΛΗ EMAIL ΜΕΣΩ BREVO SMTP (FORM DATA VERSION) ---
@routes.route('/api/send-trip-email', methods=['POST'])
def send_trip_email():
    # Σημείωση: Αφαιρέθηκε το methods=['OPTIONS'], το @cross_origin και τα χειροκίνητα CORS headers.
    # Το παγκόσμιο CORS(app) από το κεντρικό αρχείο αναλαμβάνει αυτόματα τα πάντα!

    try:
        # Διαβάζουμε τα δεδομένα από το FormData
        user_email = request.form.get('email')
        trip_location = request.form.get('location', 'Πλάνο Ταξιδιού')
        
        # Έλεγχος αν υπάρχει το αρχείο στο request
        if 'file' not in request.files:
            return jsonify({"error": "Λείπει το απαραίτητο αρχείο εικόνας."}), 400

        image_file = request.files['file']
        user_email = user_email.strip() if user_email else None

        if not user_email:
            return jsonify({"error": "Λείπει η διεύθυνση email."}), 400

        # Διαβάζουμε απευθείας τα binary bytes της εικόνας
        pdf_data = image_file.read()

        # 1. Δημιουργία του MIME Πολυμεσικού Μηνύματος
        sender_email = os.getenv("SMTP_SENDER")
        msg = MIMEMultipart()
        msg['From'] = f"Travel Journal <{sender_email}>"
        msg['To'] = user_email
        msg['Subject'] = f"Το Ταξιδιωτικό σας Πλάνο: {trip_location}"

        body = f"""
        <h3>Γεια σας!</h3>
        <p>Σας στέλνουμε συνημμένο το πρόγραμμα του ταξιδιού σας για τον προορισμό: <strong>{trip_location}</strong>.</p>
        <p>Καλή διασκέδαση,<br><em>Η ομάδα του Travel Journal</em></p>
        """
        msg.attach(MIMEText(body, 'html', 'utf-8'))

        # 2. Δημιουργία του Συνημμένου Αρχείου (JPEG)
        attachment = MIMEBase('image', 'jpeg')  
        attachment.set_payload(pdf_data)
        encoders.encode_base64(attachment)
        
        filename = f"Trip_{trip_location.replace(' ', '_')}.jpg"
        attachment.add_header('Content-Disposition', f'attachment; filename="{filename}"')
        msg.attach(attachment)

        # 3. Ασφαλής Ανάγνωση των στοιχείων από το αρχείο .env
        smtp_server = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
        port = int(os.getenv("SMTP_PORT", 587))
        username = os.getenv("SMTP_USERNAME")
        password = os.getenv("SMTP_PASSWORD")

        # 🔍 ΠΡΟΣΘΗΚΗ DEBUG PRINTS (Εδώ μπαίνουν, ακριβώς πριν τη σύνδεση!)
        #print("\n--- [DEBUG] ΕΛΕΓΧΟΣ ΣΤΟΙΧΕΙΩΝ SMTP ---")
        #print(f"SMTP Server: {smtp_server} | Port: {port}")
        #print(f"SMTP Username: {username}")
        #print(f"SMTP Password (Μήκος χαρακτήρων): {len(password) if password else 'None/Δεν βρέθηκε'}")
        #print(f"Ξεκινάει με xsmtpsib-; {'ΝΑΙ' if password and password.startswith('xsmtpsib-') else 'ΟΧΙ'}")
        #print("--------------------------------------\n")
        

        # 4. Σύνδεση στον SMTP Server της Brevo και Αποστολή
        server = smtplib.SMTP(smtp_server, port)
        server.starttls()  
        server.login(username, password)
        server.sendmail(sender_email, user_email, msg.as_string())
        server.quit()

        return jsonify({"message": "Το email στάλθηκε επιτυχώς!"}), 200

    except Exception as e:
        print("Γενικό σφάλμα στο send-trip-email:")
        traceback.print_exc()  
        return jsonify({"error": "Αποτυχία αποστολής email.", "details": str(e)}), 500
    
    # --- 6. ΣΤΑΤΙΣΤΙΚΑ ΔΗΜΟΦΙΛΩΝ ΠΕΡΙΟΧΩΝ (AGGREGATION) ---
@routes.route('/api/search-statistics', methods=['GET'])
def get_search_statistics():
    try:
        # 1. Υπολογισμός του συνολικού αριθμού των εγγράφων στη συλλογή trips
        total_trips = db.trips.count_documents({"location": {"$exists": True, "$ne": None, "$ne": ""}})
        
        if total_trips == 0:
            return jsonify([]), 200

        # 2. Aggregation Pipeline: Ομαδοποίηση ανά τοποθεσία και μέτρημα εμφανίσεων
        pipeline = [
            # Φιλτράρουμε έγκυρα non-empty locations
            {"$match": {"location": {"$exists": True, "$ne": None, "$ne": ""}}},
            
            # Group ανά location και αύξηση του count κατά 1 για κάθε έγγραφο
            {"$group": {
                "_id": "$location",
                "count": {"$sum": 1}
            }},
            
            # Ταξινόμηση από το μεγαλύτερο count στο μικρότερο (Φθίνουσα)
            {"$sort": {"count": -1}}
        ]

        results = list(db.trips.aggregate(pipeline))

        # 3. Μορφοποίηση των αποτελεσμάτων και υπολογισμός των ποσοστών %
        statistics = []
        for item in results:
            location_name = item["_id"]
            count = item["count"]
            percentage = round((count / total_trips) * 100, 1)

            statistics.append({
                "location": location_name,
                "count": count,
                "percentage": percentage
            })

        return jsonify(statistics), 200

    except Exception as e:
        print("Σφάλμα κατά την ανάκτηση των στατιστικών:")
        traceback.print_exc()
        return jsonify({"error": "Αποτυχία φόρτωσης στατιστικών αναζήτησης.", "details": str(e)}), 500