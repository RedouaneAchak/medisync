import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendDoctor, BackendRoom } from '../../services/medisync.models';

interface BookingDoctor {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  location: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
}

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent],
})
export class BookingPage implements OnInit {
  doctor: BookingDoctor | null = null;
  rooms: BackendRoom[] = [];
  error = '';
  saving = false;
  loadingSlots = false;

  motifs = ['Consultation générale', 'Suivi', 'Urgence', 'Première visite'];
  selectedMotif = '';
  selectedDate = this.generateDates()[0]?.full ?? '';
  selectedSlot = '';

  availableDates = this.generateDates();
  timeSlots: Array<{ time: string; available: boolean }> = [];

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {}

  ngOnInit(): void {
    this.resolveDoctor();
    this.loadRooms();
  }

  generateDates(): Array<{ day: string; num: string; full: string }> {
    const dates: Array<{ day: string; num: string; full: string }> = [];
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const today = new Date();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: days[date.getDay()],
        num: date.getDate().toString(),
        full: date.toISOString().split('T')[0],
      });
    }
    return dates;
  }

  selectDate(date: string): void {
    this.selectedDate = date;
    this.selectedSlot = '';
    this.refreshSlots();
  }

  selectSlot(slot: { time: string; available: boolean }): void {
    if (slot.available) {
      this.selectedSlot = slot.time;
    }
  }

  canConfirm(): boolean {
    return !!this.doctor && !!this.selectedMotif && !!this.selectedDate && !!this.selectedSlot && !!this.rooms[0]?.id;
  }

  confirmBooking(): void {
    const user = this.authService.currentUser();
    const roomId = this.rooms[0]?.id;

    if (!user || !this.doctor || !roomId || !this.canConfirm()) {
      this.error = 'Informations incomplètes pour créer le rendez-vous.';
      return;
    }

    this.saving = true;
    this.error = '';

    this.api
      .createAppointment({
        patientId: user.userId,
        doctorId: this.doctor.id,
        roomId,
        dateTime: `${this.selectedDate}T${this.selectedSlot}:00`,
        durationMinutes: 30,
        appointmentType: this.selectedMotif,
        description: 'Réservation effectuée depuis l’application mobile',
      })
      .subscribe({
        next: () => {
          this.saving = false;
          alert(
            `RDV confirmé avec ${this.doctor?.name}\n📅 ${this.selectedDate} à ${this.selectedSlot}\nMotif : ${this.selectedMotif}`,
          );
          void this.router.navigate(['/appointments']);
        },
        error: () => {
          this.saving = false;
          this.error = 'Création impossible. Le créneau ou la salle est peut-être déjà pris.';
        },
      });
  }

  goBack(): void {
    void this.router.navigate(['/search']);
  }

  private resolveDoctor(): void {
    const state = (this.router.getCurrentNavigation()?.extras?.state ?? window.history.state) as { doctor?: BookingDoctor };
    if (state?.doctor?.id) {
      this.doctor = state.doctor;
      this.refreshSlots();
      return;
    }

    this.api.getDoctors().subscribe({
      next: (doctors: BackendDoctor[]) => {
        if (!doctors.length) {
          this.error = 'Aucun médecin disponible.';
          return;
        }
        this.doctor = this.toBookingDoctor(doctors[0], 0);
        this.refreshSlots();
      },
      error: () => {
        this.error = 'Impossible de charger un médecin pour la réservation.';
      },
    });
  }

  private loadRooms(): void {
    this.api.getRooms().subscribe({
      next: (rooms: BackendRoom[]) => {
        this.rooms = rooms;
        if (!rooms.length) {
          this.error = 'Aucune salle backend disponible.';
        }
      },
      error: () => {
        this.error = 'Impossible de charger les salles.';
      },
    });
  }

  private refreshSlots(): void {
    if (!this.doctor || !this.selectedDate) {
      return;
    }

    this.loadingSlots = true;
    this.api.getAvailableSlots(this.doctor.id, this.selectedDate).subscribe({
      next: (slots: string[]) => {
        this.loadingSlots = false;
        this.timeSlots = slots.map((slot) => ({ time: slot.slice(11, 16), available: true }));
        this.selectedSlot = this.timeSlots[0]?.time ?? '';
      },
      error: () => {
        this.loadingSlots = false;
        this.timeSlots = [];
        this.selectedSlot = '';
        this.error = 'Impossible de charger les créneaux disponibles.';
      },
    });
  }

  private toBookingDoctor(doctor: BackendDoctor, index: number): BookingDoctor {
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
}
