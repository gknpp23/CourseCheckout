




































import { Routes } from '@angular/router';
import { RegistrationFormComponent } from './components/registration-form/registration-form.component';



export const routes: Routes = [
  { path: '', component: RegistrationFormComponent }, // Rota principal
  {
    path: 'success',
    loadComponent: () =>
      import('./components/success-page/success-page.component').then(
        (m) => m.SuccessPageComponent
      ),
  },
  //Essa rota deve sempre vir por último
  { path: '**', redirectTo: '' },// Redireciona rotas inválidas
  
  
];