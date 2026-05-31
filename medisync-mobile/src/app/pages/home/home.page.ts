import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendAppointment, BackendDoctor } from '../../services/medisync.models';

interface DoctorPreview {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  location: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
}

interface NextAppointmentCard {
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  statusLabel: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent],
})
export class HomePage {
  greetingName = 'Patient';
  notificationCount = 0;
  nextAppointment: NextAppointmentCard | null = null;
  recentDoctors: DoctorPreview[] = [];
  error = '';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {}

  ionViewWillEnter(): void {
    this.loadDashboard();
  }

  goToSearch(): void {
    void this.router.navigate(['/search']);
  }

  goToDossier(): void {
    void this.router.navigate(['/dossier']);
  }

  goToAppointments(): void {
    void this.router.navigate(['/appointments']);
  }

  goToNotifications(): void {
    void this.router.navigate(['/notifications']);
  }

  goToBooking(doctor?: DoctorPreview): void {
    void this.router.navigate(['/booking'], doctor ? { state: { doctor } } : undefined);
  }

  private loadDashboard(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.authService.logout();
      return;
    }

    this.greetingName = user.firstname || 'Patient';
    this.error = '';

    forkJoin({
      appointments: this.api.getPatientAppointments(user.userId),
      doctors: this.api.getDoctors(),
    }).subscribe({
      next: ({ appointments, doctors }: { appointments: BackendAppointment[]; doctors: BackendDoctor[] }) => {
        const upcoming = appointments
          .filter((appointment) => appointment.status !== 'CANCELLED' && new Date(appointment.dateTime).getTime() >= Date.now())
          .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());

        this.nextAppointment = upcoming[0] ? this.toNextAppointment(upcoming[0]) : null;
        this.notificationCount = Math.min(2, upcoming.length);
        this.recentDoctors = this.buildRecentDoctors(appointments, doctors).slice(0, 3);
      },
      error: () => {
        this.error = 'Impossible de charger votre tableau de bord mobile.';
        this.nextAppointment = null;
        this.recentDoctors = [];
      },
    });
  }

  private buildRecentDoctors(appointments: BackendAppointment[], doctors: BackendDoctor[]): DoctorPreview[] {
    const unique = new Map<number, DoctorPreview>();

    appointments.forEach((appointment) => {
      const doctor = appointment.doctor;
      if (!doctor || unique.has(doctor.id)) {
        return;
      }
      unique.set(doctor.id, this.toDoctorPreview(doctor, unique.size));
    });

    if (!unique.size) {
      doctors.slice(0, 3).forEach((doctor, index) => unique.set(doctor.id, this.toDoctorPreview(doctor, index)));
    }

    return Array.from(unique.values());
  }

  private toDoctorPreview(doctor: BackendDoctor, index: number): DoctorPreview {
    const palette = [
      { bg: '#dbeafe', color: '#1565C0' },
      { bg: '#fef3c7', color: '#92400e' },
      { bg: '#dcfce7', color: '#166534' },
    ];
    const firstName = doctor.user?.firstname ?? 'Dr';
    const lastName = doctor.user?.lastname ?? `${doctor.id}`;
    const colors = palette[index % palette.length];

    return {
      id: doctor.id,
      name: `Dr. ${firstName} ${lastName}`.trim(),
      specialty: doctor.specialty ?? 'Médecine générale',
      rating: 4.8,
      location: 'MediSync',
      initials: `${firstName[0] ?? 'D'}${lastName[0] ?? 'R'}`.toUpperCase(),
      avatarBg: colors.bg,
      avatarColor: colors.color,
    };
  }

  private toNextAppointment(appointment: BackendAppointment): NextAppointmentCard {
    const preview = appointment.doctor ? this.toDoctorPreview(appointment.doctor, 0) : null;
    const date = new Date(appointment.dateTime);
    return {
      doctor: preview?.name ?? 'Médecin',
      specialty: appointment.doctor?.specialty ?? appointment.appointmentType ?? 'Consultation',
      date: date.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }),
      location: appointment.room?.roomNumber ? `Salle ${appointment.room.roomNumber}` : 'Clinique MediSync',
      statusLabel: appointment.status === 'CONFIRMED' ? 'Confirmé' : 'En attente',
      initials: preview?.initials ?? 'MS',
      avatarBg: preview?.avatarBg ?? '#dbeafe',
      avatarColor: preview?.avatarColor ?? '#1565C0',
    };
  }
}
