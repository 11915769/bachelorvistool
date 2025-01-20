import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://127.0.0.1:5000/api';

  constructor(private http: HttpClient) {}

  getData(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/data`);
  }

  sendData(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data`, data);
  }
}
