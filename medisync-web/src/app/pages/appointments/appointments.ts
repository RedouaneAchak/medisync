import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Appointment, appointments, StatusTone } from '../../data/medisync-data';
import { AuthService } from '../../services/auth.service';
import { BackendAppointment, BackendRoom, MedisyncApiService } from '../../services/medisync-api.service';

interface AppointmentRow extends Appointment {
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
  appointments: AppointmentRow[] = appointments.map((appointment) => ({
    ...appointment,
    durationMinutes: 30,
    roomId: 0,
    isoDate: '',
  }));
  rooms: BackendRoom[] = [];
  activeTab = 'A venir';
  tabs = ['A venir', 'A confirmer', 'Historique'];
  error = '';
  message = '';
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
      this.message = 'Choisissez une salle avant de modifier le rendez-vous.';
      return;
    }

    this.api
      .updateAppointment(this.editingId, {
        dateTime: `${this.editForm.date}T${this.editForm.time}:00`,
        durationMinutes: this.editForm.durationMinutes,
        roomId: this.editForm.roomId,
      })
      .subscribe({
        next: (updated) => {
          this.appointments = this.appointments.map((appointment) =>
            appointment.id === updated.id ? this.toAppointmentRow(updated) : appointment,
          );
          this.editingId = null;
          this.message = 'Rendez-vous modifie.';
        },
        error: () => {
          this.message = 'Modification impossible: creneau ou salle indisponible.';
        },
      });
  }

  cancel(id: number): void {
    this.api.cancelAppointment(id).subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((appointment) =>
          appointment.id === id ? this.toAppointmentRow(updated) : appointment,
        );
      },
    });
  }

  confirm(id: number): void {
    this.api.confirmAppointment(id).subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((appointment) =>
          appointment.id === id ? this.toAppointmentRow(updated) : appointment,
        );
      },
    });
  }

  private loadAppointments(): void {
    const user = this.authService.currentUser();
    const request = user?.role === 'PATIENT' ? this.api.getPatientAppointments(user.userId) : this.api.getAppointments();

    request.subscribe({
      next: (items) => {
        this.appointments = items.map((appointment) => this.toAppointmentRow(appointment));
      },
      error: () => {
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
}
