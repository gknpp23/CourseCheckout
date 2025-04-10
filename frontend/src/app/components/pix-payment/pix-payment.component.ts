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
  paymentData = {
    pixKey: '00020126360014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426655440000520400005303986540',
    amount: 0,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    beneficiary: 'CURSOS ONLINE LTDA',
    document: '12.345.678/0001-99',
    transactionId: ''
  };

  loading = true;
  qrCodeData = '';
  enrollmentService: any;

  constructor(
    private route: ActivatedRoute,
    private snackBar: MatSnackBar, 
    private clipboard: Clipboard
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.paymentData.amount = params['amount'] || 0;
      this.paymentData.transactionId = params['transactionId'] || '';
      this.generatePixData();
      this.loading = false;
    });
  }

  generatePixData() {
    // Formato básico de payload PIX
    this.qrCodeData = `000201
      26580014BR.GOV.BCB.PIX
      0136${this.paymentData.pixKey}
      52040000
      5303986
      54${this.paymentData.amount.toFixed(2)}
      5802BR
      5909${this.paymentData.beneficiary}
      6008BRASILIA
      62070503***
      6304`;

    // Remove espaços e quebras de linha
    this.qrCodeData = this.qrCodeData.replace(/\s+/g, '');
  }

  copyToClipboard(text: string) {
    this.clipboard.copy(text);
    this.snackBar.open('Copiado para a área de transferência!', 'Fechar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

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
}