import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  registerStudent(studentData: any) {
    return this.http.post(`${this.apiUrl}/api/inscricao`, studentData);
  }
}