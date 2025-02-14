import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://127.0.0.1:5000/api';

  constructor(private http: HttpClient) {
  }

  uploadFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/upload`, formData);
  }

  uploadFiles(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/uploads`, formData);
  }
}



