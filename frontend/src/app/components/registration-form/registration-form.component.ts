import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
  private router: Router = new Router();
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
  
      console.log('Dados enviados para o backend:', this.registrationForm.value);
  
      this.http.post('http://localhost:3000/api/inscricao', this.registrationForm.value)
        .subscribe({
          next: (res: any) => {
            console.log('Dados recebidos do backend:', res);
  
            this.http.post('http://localhost:3000/api/abacatepay', {
              nome: res.aluno.nome,
              email: res.aluno.email,
              celular: res.aluno.celular,
              taxId: '217.625.080-01' 
            }).subscribe({
              next: (payRes) => {
                console.log('Pagamento realizado com sucesso:', payRes);
                this.isLoading = false;
                alert('Inscrição e pagamento realizados com sucesso!');
                this.router.navigate(['/success']);
              },
              error: (payErr) => {
                this.isLoading = false;
                alert('Erro ao enviar dados para o AbacatePay: ' + payErr.error?.message || 'Erro desconhecido');
              }
            });
          },
          error: (err: { error: { message: string; }; }) => {
            this.isLoading = false;
            alert('Erro na inscrição: ' + err.error?.message || 'Erro desconhecido');
          }
        });
    }
  }
  


}
