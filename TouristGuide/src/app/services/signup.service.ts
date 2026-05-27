import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignupService {

   private apiUrl = 'http://localhost:5000/signup';

  constructor(private http: HttpClient) { }

  /**
   * Μέθοδος για την εγγραφή νέου χρήστη
   * @param userData Τα δεδομένα του χρήστη (username, password, κλπ)
   */
  signup(userData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    

    return this.http.post(this.apiUrl, userData, { headers });
  }
  
  

  
}
