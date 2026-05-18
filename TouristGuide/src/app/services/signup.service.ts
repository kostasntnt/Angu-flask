import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignupService {

  // Χρησιμοποιούμε το localhost:5000 για συνέπεια με τα άλλα services
  private apiUrl = 'http://localhost:5000/signup';

  constructor(private http: HttpClient) { }

  /**
   * Μέθοδος για την εγγραφή νέου χρήστη
   * @param userData Τα δεδομένα του χρήστη (username, password, κλπ)
   */
  signup(userData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    
    // Προσθήκη :any στο error handling του component που καλεί αυτή τη μέθοδο
    // θα λύσει το TS7006 σφάλμα που είχαμε πριν
    return this.http.post(this.apiUrl, userData, { headers });
  }
  
  

  
}
