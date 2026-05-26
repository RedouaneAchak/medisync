import { Component } from '@angular/core';
import { invoices } from '../../data/medisync-data';

@Component({
  selector: 'app-billing',
  templateUrl: './billing.html',
})
export class Billing {
  invoices = invoices;

  get totalOpen() {
    return this.invoices.filter((invoice) => !invoice.paid).reduce((sum, invoice) => sum + invoice.amount, 0);
  }
}
