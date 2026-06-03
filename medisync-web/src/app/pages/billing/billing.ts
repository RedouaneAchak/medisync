import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BackendAppointment, BackendCareSheet, BackendInvoice, BackendMedicalAct, MedisyncApiService } from '../../services/medisync-api.service';

interface InvoiceRow {
  backendId: number;
  id: string;
  patient: string;
  email: string;
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
  careSheets: BackendCareSheet[] = [];
  medicalActs: BackendMedicalAct[] = [];
  error = '';
  message = '';
  paymentMethods = ['CASH', 'CARD', 'INSURANCE'];
  newInvoice = {
    appointmentId: 0,
    amount: 300,
    paymentMethod: 'CASH',
  };
  newCareSheet = {
    appointmentId: 0,
    medicalActId: 0,
    amount: 300,
    notes: '',
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
      this.loadCareSheetData();
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

  exportInvoice(invoice: InvoiceRow): void {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.message = 'Impossible d’ouvrir la fenêtre d’export.';
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1f2937; }
            h1 { margin-bottom: 8px; }
            .muted { color: #6b7280; margin-bottom: 24px; }
            .line { margin: 12px 0; }
            .total { font-size: 24px; font-weight: bold; margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>${invoice.id}</h1>
          <div class="muted">Facture MediSync exportable en PDF depuis la boîte de dialogue d’impression.</div>
          <div class="line"><strong>Patient:</strong> ${invoice.patient}</div>
          <div class="line"><strong>Prestation:</strong> ${invoice.appointment}</div>
          <div class="line"><strong>Paiement:</strong> ${invoice.method}</div>
          <div class="line"><strong>Statut:</strong> ${invoice.paid ? 'Payée' : 'En attente'}</div>
          <div class="total">${invoice.amount} MAD</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  emailInvoice(invoice: InvoiceRow): void {
    if (!invoice.email) {
      this.message = 'Aucune adresse email disponible pour ce patient.';
      return;
    }
    this.api.sendInvoiceEmail(invoice.backendId).subscribe({
      next: () => {
        this.message = `Facture ${invoice.id} envoyée par email à ${invoice.email}.`;
      },
      error: () => {
        this.message = 'Envoi email impossible. Vérifiez la configuration SMTP du backend.';
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

  createCareSheet(): void {
    this.message = '';
    if (!this.newCareSheet.appointmentId || !this.newCareSheet.medicalActId) {
      this.message = 'Choisissez un rendez-vous et un acte médical.';
      return;
    }
    this.api.createCareSheet(this.newCareSheet).subscribe({
      next: (careSheet) => {
        this.careSheets = [careSheet, ...this.careSheets];
        this.message = `Feuille de soins #${careSheet.id} générée.`;
        this.newCareSheet.notes = '';
      },
      error: () => {
        this.message = 'Création de la feuille de soins impossible.';
      },
    });
  }

  invoiceCareSheet(careSheet: BackendCareSheet): void {
    this.message = '';
    this.api.generateInvoiceFromCareSheet(careSheet.id, this.newInvoice.paymentMethod).subscribe({
      next: (invoice) => {
        this.invoices = [this.toInvoiceRow(invoice), ...this.invoices];
        this.careSheets = this.careSheets.map((item) =>
          item.id === careSheet.id ? { ...item, status: 'INVOICED' } : item,
        );
        this.message = `Feuille de soins #${careSheet.id} facturée.`;
      },
      error: () => {
        this.message = 'Facturation de la feuille de soins impossible.';
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
      email: patient?.user?.email ?? '',
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
        if (!this.newCareSheet.appointmentId) {
          this.newCareSheet.appointmentId = this.pendingAppointments[0]?.id ?? 0;
        }
      },
    });
  }

  private loadCareSheetData(): void {
    this.api.getCareSheets().subscribe({
      next: (items) => {
        this.careSheets = items;
      },
    });
    this.api.getMedicalActs().subscribe({
      next: (items) => {
        this.medicalActs = items;
        if (!this.newCareSheet.medicalActId) {
          this.newCareSheet.medicalActId = items[0]?.id ?? 0;
          this.newCareSheet.amount = items[0]?.baseTariff ?? 300;
        }
      },
    });
  }

  updateCareSheetAmount(): void {
    const act = this.medicalActs.find((item) => item.id === this.newCareSheet.medicalActId);
    this.newCareSheet.amount = act?.baseTariff ?? this.newCareSheet.amount;
  }
}
