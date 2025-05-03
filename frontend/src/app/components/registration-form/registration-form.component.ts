import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    CommonModule
  ],
  templateUrl: './registration-form.component.html',
  styleUrls: ['./registration-form.component.scss']
})
export class RegistrationFormComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  registrationForm = this.fb.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    celular: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
    idade: ['', [Validators.required, Validators.min(18)]]
  });

  isLoading: boolean | undefined;

  onSubmit() {
    if (this.registrationForm.valid) {
      this.isLoading = true;

      const { nome, email, celular } = this.registrationForm.value;

      console.log('Enviando dados para inscrição...');

      // Primeiro envia os dados para inscrição
      this.http.post('https://coursecheckout-backend-production.up.railway.app/api/students/inscricao', this.registrationForm.value)
        .subscribe({
          next: (res: any) => {
            console.log('Inscrição salva com sucesso:', res);

            // Depois chama o checkout
            this.http.post<{ checkoutUrl: string }>('https://coursecheckout-backend-production.up.railway.app/api/payments/checkout', {
              nome,
              email,
              celular,
              taxId: '21762508001' // Pode ser fixo ou vir de outro campo
            }).subscribe({
              next: (res) => {
                console.log('Checkout URL recebida:', res.checkoutUrl);
                this.isLoading = false;
                window.location.href = res.checkoutUrl; // Redireciona para o checkout
              },
              error: (err) => {
                this.isLoading = false;
                alert('Erro no checkout: ' + (err.error?.message || 'Erro desconhecido'));
              }
            });
          },
          error: (err) => {
            this.isLoading = false;
            alert('Erro ao salvar inscrição: ' + (err.error?.message || 'Erro desconhecido'));
          }
        });
    }
  }
}
