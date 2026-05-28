import { Component } from '@angular/core';
import { invoices } from '../../data/medisync-data';
import { AuthService } from '../../services/auth.service';
import { BackendInvoice, MedisyncApiService } from '../../services/medisync-api.service';

interface InvoiceRow {
  backendId: number;
  id: string;
  patient: string;
  appointment: string;
  amount: number;
  method: string;
  paid: boolean;
}

@Component({
  selector: 'app-billing',
  templateUrl: './billing.html',
})
export class Billing {
  invoices: InvoiceRow[] = invoices.map((invoice, index) => ({ ...invoice, backendId: index + 1 }));
  error = '';
  message = '';

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
  ) {
    const user = this.authService.currentUser();
    const request = user?.role === 'PATIENT' ? this.api.getPatientInvoices(user.userId) : this.api.getInvoices();
    request.subscribe({
      next: (items) => {
        this.invoices = items.map((invoice) => this.toInvoiceRow(invoice));
      },
      error: () => {
        this.error = 'Connectez-vous pour charger les factures depuis le backend.';
      },
    });
  }

  get totalOpen() {
    return this.invoices.filter((invoice) => !invoice.paid).reduce((sum, invoice) => sum + invoice.amount, 0);
  }

  get paidCount() {
    return this.invoices.filter((invoice) => invoice.paid).length;
  }

  markPaid(invoice: InvoiceRow): void {
    this.message = '';
    this.api.markInvoicePaid(invoice.backendId).subscribe({
      next: (updated) => {
        this.invoices = this.invoices.map((item) =>
          item.backendId === invoice.backendId ? this.toInvoiceRow(updated) : item,
        );
        this.message = `${invoice.id} marquee comme payee.`;
      },
      error: () => {
        this.message = 'Paiement impossible. Cette action est reservee au secretariat ou a l administration.';
      },
    });
  }

  private toInvoiceRow(invoice: BackendInvoice): InvoiceRow {
    const appointment = invoice.appointment;
    const patient = appointment?.patient;
    return {
      backendId: invoice.id,
      id: `FAC-${invoice.id}`,
      patient: `${patient?.firstName ?? patient?.user?.firstname ?? 'Patient'} ${patient?.lastName ?? patient?.user?.lastname ?? ''}`.trim(),
      appointment: appointment?.appointmentType ?? 'Consultation',
      amount: invoice.totalAmount,
      method: invoice.paymentMethod ?? '-',
      paid: invoice.isPaid,
    };
  }
}
