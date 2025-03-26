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
  templateUrl:'./registration-form.component.html',
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

  onSubmit() {
    if (this.registrationForm.valid) {
      this.http.post('http://localhost:3000/api/inscricao', this.registrationForm.value)
        .subscribe({
          next: (res: any) => {
            alert(`Inscrição realizada! Chave Pix: ${res.chavePix}`);
          },
          error: (err) => {
            alert('Erro na inscrição: ' + err.error?.message || 'Erro desconhecido');
          }
        });
    }
  }
}