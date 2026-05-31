import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  date: string; // Ajout de la date pour plus de détails
}

@Component({
  selector: 'app-billing',
  imports: [FormsModule],
  templateUrl: './billing.html',
})
export class Billing implements OnInit {
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
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const request = user?.role === 'PATIENT' ? this.api.getPatientInvoices(user.userId) : this.api.getInvoices();
    
    request.subscribe({
      next: (items) => {
        this.invoices = items.map((invoice) => this.toInvoiceRow(invoice));
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Connectez-vous pour charger les factures depuis le backend.';
        this.cdr.detectChanges();
      },
    });

    if (this.canCollectPayments) {
      this.loadAppointmentsForInvoicing();
    }
  }

  // Sécurisation du calcul en s'assurant qu'on additionne bien des nombres
  get totalOpen() {
    return this.invoices
      .filter((invoice) => !invoice.paid)
      .reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
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
        this.message = `${invoice.id} marquée comme payée.`;
        this.cdr.detectChanges();
      },
      error: () => {
        this.message = 'Paiement impossible. Vérifiez vos droits.';
        this.cdr.detectChanges();
      },
    });
  }

  createInvoice(): void {
    this.message = '';

    if (!this.newInvoice.appointmentId || this.newInvoice.amount <= 0) {
      this.message = 'Choisissez un rendez-vous et un montant valide.';
      this.cdr.detectChanges();
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
        this.message = `Facture FAC-${invoice.id} générée avec succès.`;
        this.cdr.detectChanges();
      },
      error: () => {
        this.message = 'Génération impossible. Vérifiez le rendez-vous, le montant et vos droits.';
        this.cdr.detectChanges();
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
    
    // 1. Correction du NaN : On force la conversion en nombre.
    // On vérifie totalAmount, et on fallback sur 'amount' au cas où le backend utilise un autre nom.
    const rawAmount = invoice.totalAmount ?? (invoice as any).amount ?? 0;
    const parsedAmount = Number(rawAmount);

    // 2. Formatage de la date d'émission (si fournie par le backend)
    const issueDate = invoice.issueDate 
      ? new Date(invoice.issueDate).toLocaleDateString('fr-MA') 
      : 'Date inconnue';

    // 3. Fallbacks sécurisés si le backend n'envoie pas le patient
    const patientName = patient 
      ? `${patient.firstName ?? patient.user?.firstname ?? ''} ${patient.lastName ?? patient.user?.lastname ?? ''}`.trim()
      : 'Non spécifié (ID RDV: ' + (appointment?.id ?? '?') + ')';

    return {
      backendId: invoice.id,
      id: `FAC-${invoice.id}`,
      patient: patientName,
      appointment: appointment?.appointmentType ?? 'Consultation',
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      method: invoice.paymentMethod ?? 'Non spécifié',
      paid: invoice.isPaid ?? false,
      date: issueDate
    };
  }

  private loadAppointmentsForInvoicing(): void {
    this.api.getAppointments().subscribe({
      next: (items) => {
        this.pendingAppointments = items.filter((appointment) => !appointment.invoice);
        if (!this.newInvoice.appointmentId) {
          this.newInvoice.appointmentId = this.pendingAppointments[0]?.id ?? 0;
        }
        this.cdr.detectChanges();
      },
    });
  }
}