import { Routes } from '@angular/router';
import { RegistrationFormComponent } from './components/registration-form/registration-form.component';
import { PixPaymentComponent } from './components/pix-payment/pix-payment.component';

export const routes: Routes = [
  { path: '', component: RegistrationFormComponent }, // Rota principal
  { path: 'pix', component: PixPaymentComponent},
  { path: '**', redirectTo: '' } // Redireciona rotas inválidas
];