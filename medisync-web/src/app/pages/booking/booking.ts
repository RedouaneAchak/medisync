import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { doctors } from '../../data/medisync-data';
import { AuthService } from '../../services/auth.service';
import { BackendDoctor, BackendRoom, MedisyncApiService } from '../../services/medisync-api.service';

@Component({
  selector: 'app-booking',
  imports: [FormsModule],
  templateUrl: './booking.html',
})
export class Booking {
  doctors = doctors;
  rooms: BackendRoom[] = [];
  selectedDoctorId = doctors[0].id;
  selectedRoomId = 0;
  selectedDate = '2026-06-10';
  selectedTime = '09:30';
  motif = 'Suivi';
  description = '';
  forSomeoneElse = false;
  loading = false;
  message = '';

  slots = ['09:00', '09:30', '10:30', '11:30', '14:00', '15:30', '16:00'];

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
  ) {
    this.loadDoctors();
    this.loadRooms();
  }

  get selectedDoctor(): string {
    return this.doctors.find((doctor) => doctor.id === this.selectedDoctorId)?.name ?? '';
  }

  submit(): void {
    const user = this.authService.currentUser();
    const roomId = this.selectedRoomId || this.rooms[0]?.id;
    if (!user || !roomId) {
      this.message = 'Connectez-vous et creez au moins une salle avant de reserver.';
      return;
    }

    if (user.role !== 'PATIENT') {
      this.message = 'La reservation directe utilise le profil patient connecte. Connectez-vous avec patient@medisync.ma ou creez un patient depuis le secretariat.';
      return;
    }

    this.loading = true;
    this.message = '';
    this.api
      .createAppointment({
        patientId: user.userId,
        doctorId: this.selectedDoctorId,
        roomId,
        dateTime: `${this.selectedDate}T${this.selectedTime}:00`,
        durationMinutes: 30,
        appointmentType: this.motif,
        description: this.description,
      })
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.message = 'Demande envoyee au backend. Statut: PENDING.';
        },
        error: (error) => {
          this.message =
            error.name === 'TimeoutError'
              ? 'Le backend ne repond pas. Verifiez que PostgreSQL et MongoDB sont demarres, puis reessayez.'
              : 'Reservation impossible. Verifiez le compte patient, le medecin, la salle et le creneau.';
        },
      });
  }

  refreshSlots(): void {
    this.api.getAvailableSlots(this.selectedDoctorId, this.selectedDate).subscribe({
      next: (slots) => {
        if (slots.length) {
          this.slots = slots.map((slot) => slot.slice(11, 16));
          this.selectedTime = this.slots[0];
        }
      },
    });
  }

  private loadDoctors(): void {
    this.api.getDoctors().subscribe({
      next: (items) => {
        if (!items.length) {
          return;
        }
        this.doctors = items.map((doctor) => this.toDoctorOption(doctor));
        this.selectedDoctorId = this.doctors[0].id;
        this.refreshSlots();
      },
    });
  }

  private loadRooms(): void {
    this.api.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.selectedRoomId = rooms[0]?.id ?? 0;
      },
    });
  }

  private toDoctorOption(doctor: BackendDoctor) {
    const firstname = doctor.user?.firstname ?? 'Dr.';
    const lastname = doctor.user?.lastname ?? `#${doctor.id}`;
    return {
      ...doctors[0],
      id: doctor.id,
      name: `${firstname} ${lastname}`.startsWith('Dr.') ? `${firstname} ${lastname}` : `Dr. ${firstname} ${lastname}`,
      specialty: doctor.specialty ?? 'Medecine generale',
      price: doctor.standardConsultationRate ?? 300,
    };
  }
}
