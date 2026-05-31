import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BackendAppointment, BackendRoom, MedisyncApiService } from '../../services/medisync-api.service';

type StatusTone = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

interface AppointmentRow {
  id: number;
  doctor: string;
  patient: string;
  specialty: string;
  date: string;
  time: string;
  room: string;
  type: string;
  status: string;
  tone: StatusTone;
  durationMinutes: number;
  roomId: number;
  isoDate: string;
}

@Component({
  selector: 'app-appointments',
  imports: [FormsModule],
  templateUrl: './appointments.html',
})
export class Appointments implements OnInit { // 1. Implémentation de OnInit
  appointments: AppointmentRow[] = [];
  rooms: BackendRoom[] = [];
  activeTab = 'A venir';
  tabs = ['A venir', 'A confirmer', 'Historique'];
  error = '';
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  loading = false;
  saving = false;
  editingId: number | null = null;
  editForm = {
    date: '',
    time: '',
    durationMinutes: 30,
    roomId: 0,
  };

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef // 2. Injection de ChangeDetectorRef
  ) {}

  // 3. Déplacement de l'initialisation dans ngOnInit
  ngOnInit(): void {
    this.loadAppointments();
    this.api.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.cdr.detectChanges(); // Forçage du rafraîchissement
      },
    });
  }

  startEdit(appointment: AppointmentRow): void {
    this.editingId = appointment.id;
    this.editForm = {
      date: appointment.isoDate,
      time: appointment.time,
      durationMinutes: appointment.durationMinutes,
      roomId: appointment.roomId || this.rooms[0]?.id || 0,
    };
    this.cdr.detectChanges(); // Sécuriser l'ouverture du formulaire
  }

  saveEdit(): void {
    if (!this.editingId || !this.editForm.roomId) {
      this.setMessage('Choisissez une salle avant de modifier le rendez-vous.', 'error');
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.message = '';
    this.api
      .updateAppointment(this.editingId, {
        dateTime: `${this.editForm.date}T${this.editForm.time}:00`,
        durationMinutes: this.editForm.durationMinutes,
        roomId: this.editForm.roomId,
      })
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (updated) => {
          this.appointments = this.appointments.map((appointment) =>
            appointment.id === updated.id ? this.toAppointmentRow(updated) : appointment,
          );
          this.editingId = null;
          this.setMessage('Rendez-vous modifie avec succes.', 'success');
          this.cdr.detectChanges(); // Forçage du rafraîchissement
        },
        error: () => {
          this.setMessage('Modification impossible: creneau ou salle indisponible.', 'error');
          this.cdr.detectChanges(); // Forçage du rafraîchissement
        },
      });
  }

  cancel(id: number): void {
    this.saving = true;
    this.message = '';
    this.api.cancelAppointment(id)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((appointment) =>
          appointment.id === id ? this.toAppointmentRow(updated) : appointment,
        );
        this.setMessage('Rendez-vous annule avec succes.', 'success');
        this.cdr.detectChanges(); // Forçage du rafraîchissement
      },
      error: () => {
        this.setMessage('Annulation impossible.', 'error');
        this.cdr.detectChanges(); // Forçage du rafraîchissement
      },
    });
  }

  confirm(id: number): void {
    this.saving = true;
    this.message = '';
    this.api.confirmAppointment(id)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((appointment) =>
          appointment.id === id ? this.toAppointmentRow(updated) : appointment,
        );
        this.setMessage('Rendez-vous confirme avec succes.', 'success');
        this.cdr.detectChanges(); // Forçage du rafraîchissement
      },
      error: () => {
        this.setMessage('Confirmation impossible.', 'error');
        this.cdr.detectChanges(); // Forçage du rafraîchissement
      },
    });
  }

  get canModifyAppointments(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'SECRETARY' || role === 'ADMIN';
  }

  get canConfirmAppointments(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'DOCTOR' || role === 'SECRETARY' || role === 'ADMIN';
  }

  get visibleAppointments(): AppointmentRow[] {
    if (this.activeTab === 'A confirmer') {
      return this.appointments.filter((appointment) => appointment.status === 'PENDING');
    }

    if (this.activeTab === 'Historique') {
      return this.appointments.filter((appointment) => this.isPast(appointment) || appointment.status === 'CANCELLED');
    }

    return this.appointments.filter((appointment) => !this.isPast(appointment) && appointment.status !== 'CANCELLED');
  }

  get upcomingCount(): number {
    return this.appointments.filter((appointment) => !this.isPast(appointment) && appointment.status !== 'CANCELLED').length;
  }

  get pendingCount(): number {
    return this.appointments.filter((appointment) => appointment.status === 'PENDING').length;
  }

  get historyCount(): number {
    return this.appointments.filter((appointment) => this.isPast(appointment) || appointment.status === 'CANCELLED').length;
  }

  private loadAppointments(): void {
    const user = this.authService.currentUser();
    this.loading = true;
    this.error = '';
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 19);
    const to = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString().slice(0, 19);
    const request =
      user?.role === 'PATIENT'
        ? this.api.getPatientAppointments(user.userId)
        : user?.role === 'DOCTOR'
          ? this.api.getDoctorAppointments(user.userId, from, to)
          : this.api.getAppointments();

    request.pipe(finalize(() => {
      this.loading = false;
      this.cdr.detectChanges();
    })).subscribe({
      next: (items) => {
        this.appointments = items.map((appointment) => this.toAppointmentRow(appointment));
        if (!items.length) {
          this.setMessage('Aucun rendez-vous trouve.', 'info');
        }
        this.cdr.detectChanges(); // Forçage du rafraîchissement
      },
      error: () => {
        this.appointments = [];
        this.error = 'Connectez-vous pour charger les rendez-vous depuis le backend.';
        this.cdr.detectChanges(); // Forçage du rafraîchissement
      },
    });
  }

  private toAppointmentRow(appointment: BackendAppointment): AppointmentRow {
    const date = new Date(appointment.dateTime);
    const doctorUser = appointment.doctor?.user;
    const patient = appointment.patient;
    const status = appointment.status ?? 'PENDING';
    return {
      id: appointment.id,
      doctor: doctorUser ? `Dr. ${doctorUser.firstname} ${doctorUser.lastname}` : 'Medecin',
      patient: `${patient?.firstName ?? patient?.user?.firstname ?? 'Patient'} ${patient?.lastName ?? patient?.user?.lastname ?? ''}`.trim(),
      specialty: appointment.doctor?.specialty ?? 'Consultation',
      date: date.toLocaleDateString('fr-MA'),
      time: date.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }),
      room: appointment.room?.roomNumber ?? '-',
      type: appointment.appointmentType ?? 'Consultation',
      status,
      tone: this.statusTone(status),
      durationMinutes: appointment.durationMinutes ?? 30,
      roomId: appointment.room?.id ?? 0,
      isoDate: appointment.dateTime.slice(0, 10),
    };
  }

  private statusTone(status: string): StatusTone {
    if (status === 'CONFIRMED') {
      return 'green';
    }
    if (status === 'CANCELLED') {
      return 'red';
    }
    return 'yellow';
  }

  private setMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.message = message;
    this.messageType = type;
    this.cdr.detectChanges(); // Sécurise l'affichage des messages flash
  }

  private isPast(appointment: AppointmentRow): boolean {
    return new Date(`${appointment.isoDate}T${appointment.time}:00`).getTime() < Date.now();
  }
}