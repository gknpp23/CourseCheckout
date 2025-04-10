import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PixPaymentComponent } from './pix-payment.component';

describe('PixPaymentComponent', () => {
  let component: PixPaymentComponent;
  let fixture: ComponentFixture<PixPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PixPaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PixPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
