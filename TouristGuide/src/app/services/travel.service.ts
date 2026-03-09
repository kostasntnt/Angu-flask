import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TravelService {
  // Η διεύθυνση του Flask Backend
  private baseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  /**
   * Βοηθητική μέθοδος για τη λήψη των Headers με το JWT Token.
   * Απαραίτητο για τις routes που έχουν @jwt_required()
   */
  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  /**
   * 1. AI Trip Generator
   * Στέλνει το ερώτημα του χρήστη στον Flask για δημιουργία προγράμματος.
   */
  generateTrip(query: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.baseUrl}/generate-trip`, { query: query }, { headers });
  }

  /**
   * 2. Nearby Recommendations
   * Στέλνει συντεταγμένες για να πάρει 6 κοντινές προτάσεις.
   */
  getNearbyRecommendations(lat: number, lng: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post(`${this.baseUrl}/nearby-recommendations`, { lat, lng }, { headers });
  }

  /**
   * 3. Browser Geolocation
   * Επιστρέφει ένα Promise με το lat και lng του χρήστη.
   */
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
          (error) => {
            reject(error);
          },
          { enableHighAccuracy: true } // Για μεγαλύτερη ακρίβεια στις συντεταγμένες
        );
      }
    });
  }
}