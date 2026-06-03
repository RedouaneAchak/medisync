import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BackendAppointment, BackendRoom, MedisyncApiService } from '../../services/medisync-api.service';

type StatusTone = 'blue' | 'green' | 'yellow' | 'red' | 'gray';
type PlanningMode = 'Jour' | 'Semaine' | 'Mois';

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
export class Appointments {
  appointments: AppointmentRow[] = [];
  rooms: BackendRoom[] = [];
  activeTab = 'A venir';
  tabs = ['A venir', 'A confirmer', 'Historique'];
  planningMode: PlanningMode = 'Semaine';
  planningModes: PlanningMode[] = ['Jour', 'Semaine', 'Mois'];
  planningDate = new Date().toISOString().slice(0, 10);
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
  ) {
    this.loadAppointments();
    this.api.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
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
  }

  saveEdit(): void {
    if (!this.editingId || !this.editForm.roomId) {
      this.setMessage('Choisissez une salle avant de modifier le rendez-vous.', 'error');
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
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (updated) => {
          this.appointments = this.appointments.map((appointment) =>
            appointment.id === updated.id ? this.toAppointmentRow(updated) : appointment,
          );
          this.editingId = null;
          this.setMessage('Rendez-vous modifie avec succes.', 'success');
        },
        error: () => {
          this.setMessage('Modification impossible: creneau ou salle indisponible.', 'error');
        },
      });
  }

  cancel(id: number): void {
    this.saving = true;
    this.message = '';
    this.api.cancelAppointment(id).subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((appointment) =>
          appointment.id === id ? this.toAppointmentRow(updated) : appointment,
        );
        this.saving = false;
        this.setMessage('Rendez-vous annule avec succes.', 'success');
      },
      error: () => {
        this.saving = false;
        this.setMessage('Annulation impossible.', 'error');
      },
    });
  }

  confirm(id: number): void {
    this.saving = true;
    this.message = '';
    this.api.confirmAppointment(id).subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((appointment) =>
          appointment.id === id ? this.toAppointmentRow(updated) : appointment,
        );
        this.saving = false;
        this.setMessage('Rendez-vous confirme avec succes.', 'success');
      },
      error: () => {
        this.saving = false;
        this.setMessage('Confirmation impossible.', 'error');
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

  get showPlanningControls(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'DOCTOR' || role === 'SECRETARY' || role === 'ADMIN';
  }

  get planningWindowLabel(): string {
    const focus = this.planningReferenceDate();
    if (this.planningMode === 'Jour') {
      return focus.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (this.planningMode === 'Semaine') {
      const start = this.startOfWeek(focus);
      const end = this.endOfWeek(focus);
      return `${start.toLocaleDateString('fr-MA')} - ${end.toLocaleDateString('fr-MA')}`;
    }
    return focus.toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' });
  }

  get visibleAppointments(): AppointmentRow[] {
    let scopedAppointments = this.appointments;

    if (this.activeTab === 'A confirmer') {
      scopedAppointments = scopedAppointments.filter((appointment) => appointment.status === 'PENDING');
    } else if (this.activeTab === 'Historique') {
      scopedAppointments = scopedAppointments.filter((appointment) => this.isPast(appointment) || appointment.status === 'CANCELLED');
    } else {
      scopedAppointments = scopedAppointments.filter((appointment) => !this.isPast(appointment) && appointment.status !== 'CANCELLED');
    }

    return this.showPlanningControls
      ? scopedAppointments.filter((appointment) => this.isInPlanningWindow(appointment))
      : scopedAppointments;
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

  setPlanningMode(mode: PlanningMode): void {
    this.planningMode = mode;
    this.loadAppointments();
  }

  onPlanningDateChange(): void {
    this.loadAppointments();
  }

  private loadAppointments(): void {
    const user = this.authService.currentUser();
    this.loading = true;
    this.error = '';
    const range = this.fetchRange();
    const request =
      user?.role === 'PATIENT'
        ? this.api.getPatientAppointments(user.userId)
        : user?.role === 'DOCTOR'
          ? this.api.getDoctorAppointments(user.userId, range.from, range.to)
          : this.api.getAppointments();

    request.pipe(finalize(() => (this.loading = false))).subscribe({
      next: (items) => {
        this.appointments = items.map((appointment) => this.toAppointmentRow(appointment));
        if (!items.length) {
          this.setMessage('Aucun rendez-vous trouve.', 'info');
        }
      },
      error: () => {
        this.appointments = [];
        this.error = 'Connectez-vous pour charger les rendez-vous depuis le backend.';
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
  }

  private fetchRange(): { from: string; to: string } {
    if (this.authService.currentUser()?.role !== 'DOCTOR') {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 19),
        to: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString().slice(0, 19),
      };
    }

    const focus = this.planningReferenceDate();
    const start =
      this.planningMode === 'Jour'
        ? this.startOfDay(focus)
        : this.planningMode === 'Semaine'
          ? this.startOfWeek(focus)
          : this.startOfMonth(focus);
    const end =
      this.planningMode === 'Jour'
        ? this.endOfDay(focus)
        : this.planningMode === 'Semaine'
          ? this.endOfWeek(focus)
          : this.endOfMonth(focus);

    return {
      from: start.toISOString().slice(0, 19),
      to: end.toISOString().slice(0, 19),
    };
  }

  private isInPlanningWindow(appointment: AppointmentRow): boolean {
    const when = new Date(`${appointment.isoDate}T${appointment.time}:00`);
    const focus = this.planningReferenceDate();

    if (this.planningMode === 'Jour') {
      return when >= this.startOfDay(focus) && when <= this.endOfDay(focus);
    }
    if (this.planningMode === 'Semaine') {
      return when >= this.startOfWeek(focus) && when <= this.endOfWeek(focus);
    }
    return when >= this.startOfMonth(focus) && when <= this.endOfMonth(focus);
  }

  private planningReferenceDate(): Date {
    return new Date(`${this.planningDate}T00:00:00`);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  }

  private endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  }

  private startOfWeek(date: Date): Date {
    const start = this.startOfDay(date);
    const day = start.getDay();
    const delta = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + delta);
    return start;
  }

  private endOfWeek(date: Date): Date {
    const end = this.endOfWeekFromStart(this.startOfWeek(date));
    return end;
  }

  private endOfWeekFromStart(start: Date): Date {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
  }

  private endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  }

  private isPast(appointment: AppointmentRow): boolean {
    return new Date(`${appointment.isoDate}T${appointment.time}:00`).getTime() < Date.now();
  }
}
