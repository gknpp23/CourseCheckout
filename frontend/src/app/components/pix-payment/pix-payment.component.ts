import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { QRCodeComponent } from 'angularx-qrcode';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pix-payment',
  templateUrl: './pix-payment.component.html',
  styleUrls: ['./pix-payment.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    QRCodeComponent,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule
  ]
})
export class PixPaymentComponent implements OnInit {
  


  constructor(
    private route: ActivatedRoute,
    
  ) {}

  ngOnInit() {
   
  }

 
  /*
  copyToClipboard(text: string) {
    this.clipboard.copy(text);
    this.snackBar.open('Copiado para a área de transferência!', 'Fechar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }
    */

  /*
  confirmPayment() {
    this.enrollmentService.confirmPayment(this.paymentData.transactionId)
      .subscribe({
        next: () => {
          this.snackBar.open('Pagamento confirmado com sucesso!', 'Fechar', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
        },
        error: (err: any) => {
          this.snackBar.open('Erro ao confirmar pagamento', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          console.error('Erro na confirmação:', err);
        }
      });
  }

  */
}