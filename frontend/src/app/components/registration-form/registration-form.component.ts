import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms';
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
    cpf: ['', [Validators.required, this.cpfValidator()]], 
    email: ['', [Validators.required, Validators.email]],
    celular: ['', [Validators.required, Validators.pattern(/^\(\d{2}\) \d{5}-\d{4}$/)]],
    idade: ['', [Validators.required, Validators.min(18), Validators.pattern(/^[0-9]*$/)]], 
  });

  isLoading: boolean | undefined;

  // Validador de CPF
  private cpfValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const cpf = control.value?.replace(/\D/g, '');
      
      if (!cpf) return null;

      // Verifica se é um CPF válido
      if (cpf.length !== 11 || !this.validarCPF(cpf)) {
        return { cpfInvalido: true };
      }
      
      return null;
    };
  }

  // Algoritmo de validação de CPF
  private validarCPF(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false; // CPF com todos dígitos iguais

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;

    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;

    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }

  // Formata o CPF durante a digitação
  formatarCPF(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 11) {
      value = value.substring(0, 11);
    }

    // Aplica a máscara
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    input.value = value;
    this.registrationForm.get('cpf')?.setValue(value, { emitEvent: false });
  }

  formatarCelular(event: Event): void {
  const input = event.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (DDD + número)
  if (value.length > 11) {
    value = value.substring(0, 11);
  }

  // Aplica a máscara progressivamente
  let formattedValue = '';
  if (value.length > 0) {
    formattedValue = `(${value.substring(0, 2)}`;
  }
  if (value.length > 2) {
    formattedValue += `) ${value.substring(2, 7)}`;
  }
  if (value.length > 7) {
    formattedValue += `-${value.substring(7, 11)}`;
  }

  // Atualiza o valor apenas se houve mudança
  if (input.value !== formattedValue) {
    input.value = formattedValue;
    this.registrationForm.get('celular')?.setValue(formattedValue, { emitEvent: false });
  }
}

bloquearNaoNumericos(event: KeyboardEvent): void {
  const teclasPermitidas = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const teclasControle = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab','(',')','-'];
  
  if (!teclasPermitidas.includes(event.key) && !teclasControle.includes(event.key)) {
    event.preventDefault();
  }
}

  onSubmit() {
    if (this.registrationForm.valid) {
      this.isLoading = true;

      const { nome, cpf, email, celular, idade } = this.registrationForm.value;

      console.log('Enviando dados para inscrição...');

      // Primeiro envia os dados para inscrição
      this.http.post('https://coursecheckout-backend-production.up.railway.app/api/students/inscricao', {
        ...this.registrationForm.value,
        cpf: cpf?.replace(/\D/g, ''),
        celular: this.registrationForm.value.celular?.replace(/\D/g, '')
      }).subscribe({
        next: (res: any) => {
          console.log('Inscrição salva com sucesso:', res);

          // Depois chama o checkout
          this.http.post<{ checkoutUrl: string }>('https://coursecheckout-backend-production.up.railway.app/api/payments/checkout', {
            nome,
            email,
            celular,
            idade,
            taxId: cpf?.replace(/\D/g, '') || '21762508001' // Usa o CPF como taxId ou valor padrão
          }).subscribe({
            next: (res) => {
              console.log('Checkout URL recebida:', res.checkoutUrl);
              this.isLoading = false;
              window.location.href = res.checkoutUrl;
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