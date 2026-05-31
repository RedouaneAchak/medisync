import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendAppointment } from '../../services/medisync.models';

interface AppointmentCard {
  id: number;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  statusLabel: string;
  statusClass: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  doctorState: {
    id: number;
    name: string;
    specialty: string;
    rating: number;
    location: string;
    initials: string;
    avatarBg: string;
    avatarColor: string;
  } | null;
}

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent],
})
export class AppointmentsPage {
  activeTab = 'upcoming';
  error = '';
  message = '';
  upcomingRdv: AppointmentCard[] = [];
  pastRdv: AppointmentCard[] = [];

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {}

  ionViewWillEnter(): void {
    this.loadAppointments();
  }

  cancelRdv(rdv: AppointmentCard): void {
    this.message = '';
    this.api.cancelAppointment(rdv.id).subscribe({
      next: () => {
        this.message = `RDV annulé avec ${rdv.doctor}`;
        this.loadAppointments();
      },
      error: () => {
        this.error = 'Annulation impossible.';
      },
    });
  }

  reschedule(rdv: AppointmentCard): void {
    void this.router.navigate(['/booking'], rdv.doctorState ? { state: { doctor: rdv.doctorState } } : undefined);
  }

  newRdv(rdv: AppointmentCard): void {
    void this.router.navigate(['/booking'], rdv.doctorState ? { state: { doctor: rdv.doctorState } } : undefined);
  }

  private loadAppointments(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.authService.logout();
      return;
    }

    this.error = '';
    this.api.getPatientAppointments(user.userId).subscribe({
      next: (appointments: BackendAppointment[]) => {
        const cards = appointments
          .map((appointment, index) => this.toAppointmentCard(appointment, index))
          .sort((left, right) => new Date(right.rawDateTime).getTime() - new Date(left.rawDateTime).getTime());

        this.upcomingRdv = cards.filter((appointment) => !appointment.isPast && appointment.statusClass !== 'pill-red');
        this.pastRdv = cards.filter((appointment) => appointment.isPast || appointment.statusClass === 'pill-red');
      },
      error: () => {
        this.error = 'Impossible de charger vos rendez-vous.';
        this.upcomingRdv = [];
        this.pastRdv = [];
      },
    });
  }

  private toAppointmentCard(
    appointment: BackendAppointment,
    index: number,
  ): AppointmentCard & { rawDateTime: string; isPast: boolean } {
    const palette = [
      { bg: '#dbeafe', color: '#1565C0' },
      { bg: '#fef3c7', color: '#92400e' },
      { bg: '#dcfce7', color: '#166534' },
    ];
    const colors = palette[index % palette.length];
    const firstName = appointment.doctor?.user?.firstname ?? 'Dr';
    const lastName = appointment.doctor?.user?.lastname ?? `${appointment.doctor?.id ?? ''}`;
    const date = new Date(appointment.dateTime);
    const status = appointment.status ?? 'PENDING';
    const isPast = date.getTime() < Date.now();

    return {
      id: appointment.id,
      doctor: `Dr. ${firstName} ${lastName}`.trim(),
      specialty: appointment.doctor?.specialty ?? appointment.appointmentType ?? 'Consultation',
      date: date.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }),
      location: appointment.room?.roomNumber ? `Salle ${appointment.room.roomNumber}` : 'Clinique MediSync',
      statusLabel: status === 'CONFIRMED' ? 'Confirmé' : status === 'CANCELLED' ? 'Annulé' : isPast ? 'Terminé' : 'En attente',
      statusClass: status === 'CONFIRMED' ? 'pill-green' : status === 'CANCELLED' ? 'pill-red' : isPast ? 'pill-gray' : 'pill-yellow',
      initials: `${firstName[0] ?? 'D'}${lastName[0] ?? 'R'}`.toUpperCase(),
      avatarBg: colors.bg,
      avatarColor: colors.color,
      doctorState: appointment.doctor
        ? {
            id: appointment.doctor.id,
            name: `Dr. ${firstName} ${lastName}`.trim(),
            specialty: appointment.doctor.specialty ?? 'Médecine générale',
            rating: 4.8,
            location: 'MediSync',
            initials: `${firstName[0] ?? 'D'}${lastName[0] ?? 'R'}`.toUpperCase(),
            avatarBg: colors.bg,
            avatarColor: colors.color,
          }
        : null,
      rawDateTime: appointment.dateTime,
      isPast,
    };
  }
}
