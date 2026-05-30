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
export class Appointments implements OnInit {
  appointments: AppointmentRow[] = [];
  rooms: BackendRoom[] = [];
  
  activeTab = 'À venir';
  tabs = ['À venir', 'À confirmer', 'Historique'];
  
  // Bulletproof state management
  error = '';
  success = '';
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
    private readonly cdr: ChangeDetectorRef // Prevents the UI sleep bug!
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
    this.api.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.cdr.detectChanges();
      },
    });
  }

  // --- THE TAB FILTER LOGIC ---
  get filteredAppointments(): AppointmentRow[] {
    const today = new Date().toISOString().slice(0, 10);
    
    return this.appointments.filter(app => {
      if (this.activeTab === 'À venir') {
        return app.isoDate >= today && app.status !== 'CANCELLED';
      }
      if (this.activeTab === 'À confirmer') {
        return app.status === 'PENDING';
      }
      if (this.activeTab === 'Historique') {
        return app.isoDate < today || app.status === 'CANCELLED';
      }
      return true;
    });
  }

  // --- ACTIONS ---

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
      this.error = 'Choisissez une salle avant de modifier le rendez-vous.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';
    
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
          this.success = 'Rendez-vous modifié avec succès.';
        },
        error: (err: any) => {
          this.error = err.error?.message || 'Modification impossible: créneau ou salle indisponible.';
        },
      });
  }

  cancel(id: number): void {
    this.saving = true;
    this.error = '';
    this.success = '';
    
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
        this.success = 'Rendez-vous annulé avec succès.';
      },
      error: () => {
        this.error = 'Annulation impossible.';
      },
    });
  }

  confirm(id: number): void {
    this.saving = true;
    this.error = '';
    this.success = '';
    
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
        this.success = 'Rendez-vous confirmé avec succès.';
      },
      error: () => {
        this.error = 'Confirmation impossible.';
      },
    });
  }

  // --- PERMISSIONS ---
  
  get canModifyAppointments(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'SECRETARY' || role === 'ADMIN';
  }

  get canCancelAppointments(): boolean {
    const role = this.authService.currentUser()?.role;
    // Patients should be allowed to cancel their own appointments!
    return role === 'PATIENT' || role === 'SECRETARY' || role === 'ADMIN';
  }

  get canConfirmAppointments(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'DOCTOR' || role === 'SECRETARY' || role === 'ADMIN';
  }

  // --- HELPERS ---

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
          this.error = 'Aucun rendez-vous trouvé.';
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
      doctor: doctorUser ? `Dr. ${doctorUser.firstname} ${doctorUser.lastname}` : 'Médecin',
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
    if (status === 'CONFIRMED') return 'green';
    if (status === 'CANCELLED') return 'red';
    return 'yellow';
  }
}