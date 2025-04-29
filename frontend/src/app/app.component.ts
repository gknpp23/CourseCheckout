import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule],
  template: `
    <mat-toolbar color="primary">
      <img src="../assets/logo.png" alt="Logo" style="height: 190px; margin-top: 5px;">
    </mat-toolbar>
    <router-outlet></router-outlet>
  `,
  styles: [`
    mat-toolbar {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
    }
    :host {
      display: block;
      padding: 20px;
    }
  `]
})
export class AppComponent {}