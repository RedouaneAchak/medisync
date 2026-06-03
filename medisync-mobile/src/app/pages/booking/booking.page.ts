import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import {
  BackendClinicProfile,
  BackendDoctor,
  BackendDoctorFeedbackSummary,
  BackendMedicalAct,
  BackendPatient,
  BackendRoom,
} from '../../services/medisync.models';

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
  imports: [CommonModule, FormsModule, IonContent, TabBarComponent],
})
export class BookingPage implements OnInit {
  doctor: BookingDoctor | null = null;
  rooms: BackendRoom[] = [];
  bookingPatients: BackendPatient[] = [];
  clinicProfile: BackendClinicProfile | null = null;
  medicalActs: BackendMedicalAct[] = [];
  selectedPatientId = 0;
  selectedMedicalActId = 0;
  error = '';
  saving = false;
  loadingSlots = false;
  private feedbackMap = new Map<number, BackendDoctorFeedbackSummary>();
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
    this.loadMedicalActs();
    this.loadBookingPatients();
    this.loadClinicProfile();
  }

  get canChooseDependent(): boolean {
    return this.bookingPatients.length > 1;
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
    return !!this.doctor && !!this.selectedMedicalAct && !!this.selectedDate && !!this.selectedSlot && !!this.rooms[0]?.id;
  }

  get selectedMedicalAct(): BackendMedicalAct | undefined {
    return this.medicalActs.find((item) => item.id === this.selectedMedicalActId);
  }

  confirmBooking(): void {
    const user = this.authService.currentUser();
    const roomId = this.rooms[0]?.id;
    const patientId = this.selectedPatientId || user?.userId;

    if (!user || !this.doctor || !roomId || !this.canConfirm() || !patientId) {
      this.error = 'Informations incomplètes pour créer le rendez-vous.';
      return;
    }

    this.saving = true;
    this.error = '';

    this.api
      .createAppointment({
        patientId,
        doctorId: this.doctor.id,
        roomId,
        dateTime: `${this.selectedDate}T${this.selectedSlot}:00`,
        durationMinutes: this.selectedMedicalAct?.durationMinutes ?? 30,
        appointmentType: this.selectedMedicalAct?.label ?? 'Consultation',
        description: 'Réservation effectuée depuis l’application mobile',
      })
      .subscribe({
        next: () => {
          this.saving = false;
          alert(
            `RDV confirmé avec ${this.doctor?.name}\n📅 ${this.selectedDate} à ${this.selectedSlot}\nMotif : ${this.selectedMedicalAct?.label ?? 'Consultation'}`,
          );
          void this.router.navigate(['/appointments']);
        },
        error: () => {
          this.saving = false;
          this.error = 'Création impossible. Le créneau ou la salle est peut-être déjà pris.';
        },
      });
  }

  openDirections(): void {
    const destination =
      this.clinicProfile?.latitude != null && this.clinicProfile?.longitude != null
        ? `${this.clinicProfile.latitude},${this.clinicProfile.longitude}`
        : encodeURIComponent(`${this.clinicProfile?.address ?? ''} ${this.clinicProfile?.city ?? ''}`.trim());
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
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

    forkJoin({
      doctors: this.api.getDoctors(),
      summaries: this.api.getDoctorFeedbackSummaries(),
    }).subscribe({
      next: ({ doctors, summaries }: { doctors: BackendDoctor[]; summaries: BackendDoctorFeedbackSummary[] }) => {
        this.feedbackMap = new Map(summaries.map((item) => [item.doctorId, item]));
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

  private loadMedicalActs(): void {
    this.api.getMedicalActs().subscribe({
      next: (acts: BackendMedicalAct[]) => {
        this.medicalActs = acts;
        this.selectedMedicalActId = acts[0]?.id ?? 0;
        this.refreshSlots();
      },
      error: () => {
        this.error = 'Impossible de charger les actes médicaux.';
      },
    });
  }

  private loadBookingPatients(): void {
    const user = this.authService.currentUser();
    if (!user) {
      return;
    }

    const selfOption: BackendPatient = {
      id: user.userId,
      firstName: user.firstname,
      lastName: user.lastname,
      user: {
        id: user.userId,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
      },
    };
    this.bookingPatients = [selfOption];
    this.selectedPatientId = user.userId;

    this.api.getDependents(user.userId).subscribe({
      next: (dependents: BackendPatient[]) => {
        this.bookingPatients = [selfOption, ...dependents];
      },
    });
  }

  private loadClinicProfile(): void {
    this.api.getClinicProfile().subscribe({
      next: (profile: BackendClinicProfile) => {
        this.clinicProfile = profile;
      },
    });

    this.api.getDoctorFeedbackSummaries().subscribe({
      next: (summaries: BackendDoctorFeedbackSummary[]) => {
        this.feedbackMap = new Map(summaries.map((item) => [item.doctorId, item]));
      },
    });
  }

  refreshSlots(): void {
    if (!this.doctor || !this.selectedDate) {
      return;
    }

    this.loadingSlots = true;
    this.api.getAvailableSlots(this.doctor.id, this.selectedDate, this.selectedMedicalAct?.durationMinutes ?? 30).subscribe({
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
      rating: Number((this.feedbackMap.get(doctor.id)?.averageRating ?? 4.8).toFixed(1)),
      location: 'MediSync',
      initials: `${firstName[0] ?? 'D'}${lastName[0] ?? 'R'}`.toUpperCase(),
      avatarBg: colors.bg,
      avatarColor: colors.color,
    };
  }
}
