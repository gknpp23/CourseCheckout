import { Routes } from '@angular/router';
import { RegistrationFormComponent } from './components/registration-form/registration-form.component';


export const routes: Routes = [
  { path: '', component: RegistrationFormComponent }, // Rota principal
  { path: '**', redirectTo: '' } // Redireciona rotas inválidas
];