import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BackendAppointment, BackendInvoice, MedisyncApiService } from '../../services/medisync-api.service';

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
  imports: [FormsModule],
  templateUrl: './billing.html',
})
export class Billing {
  invoices: InvoiceRow[] = [];
  pendingAppointments: BackendAppointment[] = [];
  error = '';
  message = '';
  paymentMethods = ['CASH', 'CARD', 'INSURANCE'];
  newInvoice = {
    appointmentId: 0,
    amount: 300,
    paymentMethod: 'CASH',
  };

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

    if (this.canCollectPayments) {
      this.loadAppointmentsForInvoicing();
    }
  }

  get totalOpen() {
    return this.invoices.filter((invoice) => !invoice.paid).reduce((sum, invoice) => sum + invoice.amount, 0);
  }

  get paidCount() {
    return this.invoices.filter((invoice) => invoice.paid).length;
  }

  get canCollectPayments(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'SECRETARY' || role === 'ADMIN';
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

  createInvoice(): void {
    this.message = '';

    if (!this.newInvoice.appointmentId || this.newInvoice.amount <= 0) {
      this.message = 'Choisissez un rendez-vous et un montant valide.';
      return;
    }

    this.api.generateInvoice(this.newInvoice).subscribe({
      next: (invoice) => {
        this.invoices = [this.toInvoiceRow(invoice), ...this.invoices];
        this.pendingAppointments = this.pendingAppointments.filter(
          (appointment) => appointment.id !== this.newInvoice.appointmentId,
        );
        this.newInvoice = {
          appointmentId: this.pendingAppointments[0]?.id ?? 0,
          amount: 300,
          paymentMethod: 'CASH',
        };
        this.message = `Facture FAC-${invoice.id} generee avec succes.`;
      },
      error: () => {
        this.message = 'Generation impossible. Verifiez le rendez-vous, le montant et vos droits.';
      },
    });
  }

  appointmentLabel(appointment: BackendAppointment): string {
    const patient = `${appointment.patient?.firstName ?? appointment.patient?.user?.firstname ?? 'Patient'} ${appointment.patient?.lastName ?? appointment.patient?.user?.lastname ?? ''}`.trim();
    const date = new Date(appointment.dateTime);
    return `#${appointment.id} - ${patient} - ${date.toLocaleDateString('fr-MA')} ${date.toLocaleTimeString('fr-MA', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
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

  private loadAppointmentsForInvoicing(): void {
    this.api.getAppointments().subscribe({
      next: (items) => {
        this.pendingAppointments = items.filter((appointment) => !appointment.invoice);
        if (!this.newInvoice.appointmentId) {
          this.newInvoice.appointmentId = this.pendingAppointments[0]?.id ?? 0;
        }
      },
    });
  }
}
