import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TravelService {
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  // Helper για τα Headers
  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // 1. Λήψη όλων των ταξιδιών του χρήστη (ΙΣΤΟΡΙΚΟ)
  getMyTrips(): Observable<any> {
    const headers = this.getHeaders();
    return this.http.get(`${this.baseUrl}/get-my-trips`, { headers });
  }

  // 2. Δημιουργία απλού ταξιδιού
  generateTrip(query: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.baseUrl}/generate-trip`, { query: query }, { headers });
  }

  // 3. Δημιουργία προσαρμοσμένου ταξιδιού
  generateCustomTrip(data: { location: string, days: number, style: string[], season: string }): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.baseUrl}/generate-custom-trip`, data, { headers });
  }

  // 4. Toggle Αγαπημένα
  toggleFavorite(tripId: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.baseUrl}/toggle-favorite`, { trip_id: tripId }, { headers });
  }

  // 5. Προτάσεις κοντινών μερών
  getNearbyRecommendations(lat: number, lng: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.baseUrl}/nearby-recommendations`, { lat, lng }, { headers });
  }

  // 6. Λήψη τοποθεσίας Browser
  getCurrentLocation(): Promise<{lat: number, lng: number}> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Η γεωγραφική τοποθεσία δεν υποστηρίζεται από τον browser σας.');
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => { reject(error); },
          { enableHighAccuracy: true }
        );
      }
    });
  }
  getCostEstimation(data: any): Observable<any> {
  const headers = this.getHeaders(); // Χρήση του υπάρχοντος helper για το JWT
  // Αφαιρούμε το /api/ αφού ο Flask δεν το αναγνωρίζει στο blueprint
  return this.http.post(`${this.baseUrl}/calculate-costs`, data, { headers });
}
  deleteTrip(tripId: string) {
  const token = localStorage.getItem('token');
  return this.http.delete(`http://localhost:5000/delete-trip/${tripId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}


}