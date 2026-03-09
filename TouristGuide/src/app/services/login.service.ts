import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class LoginService {
  
  private apiUrl = 'http://127.0.0.1:5000/login';

  constructor(private http: HttpClient) { }

  login(userData: any): Observable<any> {
    return this.http.post(this.apiUrl, userData, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    });
  }


}
