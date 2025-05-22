import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    CommonModule
  ],
  templateUrl: './registration-form.component.html',
  styleUrls: ['./registration-form.component.scss']
})
export class RegistrationFormComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private destroy$ = new Subject<void>();

  registrationForm = this.fb.group({
    nome: ['', [Validators.required]],
    cpf: ['', [Validators.required, this.cpfValidator()]], 
    email: ['', [Validators.required, Validators.email]],
    celular: ['', [Validators.required, Validators.pattern(/^\(\d{2}\) \d{5}-\d{4}$/)]],
    idade: ['', [Validators.required, Validators.min(18), Validators.pattern(/^[0-9]*$/)]], 
  });

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  // Validador de CPF
  private cpfValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const cpf = control.value?.replace(/\D/g, '');
      
      if (!cpf) return null;

      if (cpf.length !== 11 || !this.validarCPF(cpf)) {
        return { cpfInvalido: true };
      }
      
      return null;
    };
  }

  private validarCPF(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false;

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

  formatarCPF(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 11) {
      value = value.substring(0, 11);
    }

    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    input.value = value;
    this.registrationForm.get('cpf')?.setValue(value, { emitEvent: false });
  }

  formatarCelular(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 11) {
      value = value.substring(0, 11);
    }

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
    if (this.registrationForm.valid && !this.isSubmitting) {
      this.isLoading = true;
      this.isSubmitting = true;

      const { nome, cpf, email, celular, idade } = this.registrationForm.value;

      const formData = {
        ...this.registrationForm.value,
        cpf: cpf?.replace(/\D/g, ''),
        celular: celular?.replace(/\D/g, '')
      };

      this.http.post('https://coursecheckout-backend-production.up.railway.app/api/students/inscricao', formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            this.http.post<{ checkoutUrl: string }>(
              'https://coursecheckout-backend-production.up.railway.app/api/payments/checkout', 
              {
                nome,
                email,
                celular: celular?.replace(/\D/g, ''),
                idade,
                taxId: cpf?.replace(/\D/g, '') || '21762508001'
              }
            ).pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (res) => {
                this.isLoading = false;
                this.isSubmitting = false;
                window.location.href = res.checkoutUrl;
              },
              error: (err) => {
                this.handleError(err, 'Erro no checkout');
              }
            });
          },
          error: (err) => {
            this.handleError(err, 'Erro ao salvar inscrição');
          }
        });
    }
  }

  private handleError(err: any, defaultMessage: string) {
    this.isLoading = false;
    this.isSubmitting = false;
    console.error(err);
    alert(`${defaultMessage}: ${err.error?.message || 'Erro desconhecido'}`);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}