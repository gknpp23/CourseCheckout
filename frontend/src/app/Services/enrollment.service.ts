import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnrollmentService {
  private apiUrl = 'http://localhost:3000/api'; // Altere para sua URL de API

  constructor(private http: HttpClient) { }

  // Método para cadastrar um novo aluno
  enrollStudent(studentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/inscricao`, studentData);
  }

  // Método para gerar pagamento PIX
  generatePixPayment(studentId: string, amount: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate-pix`, { studentId, amount });
  }

  // Método para confirmar pagamento
  confirmPayment(transactionId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/confirm-payment/${transactionId}`, {});
  }

  // Método para verificar status de pagamento
  checkPaymentStatus(transactionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment-status/${transactionId}`);
  }

  // Método para verificar se email já existe
  checkEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-email?email=${encodeURIComponent(email)}`);
  }
}