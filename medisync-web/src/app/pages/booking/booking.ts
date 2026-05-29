import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BackendDoctor, BackendPatient, BackendRoom, MedisyncApiService } from '../../services/medisync-api.service';

interface DoctorOption {
  id: number;
  name: string;
  specialty: string;
  price: number;
}

@Component({
  selector: 'app-booking',
  imports: [FormsModule],
  templateUrl: './booking.html',
})
export class Booking {
  doctors: DoctorOption[] = [];
  rooms: BackendRoom[] = [];
  patients: BackendPatient[] = [];
  selectedDoctorId = 0;
  selectedRoomId = 0;
  selectedPatientId = 0;
  selectedDate = new Date().toISOString().slice(0, 10);
  selectedTime = '09:30';
  motif = 'Suivi';
  description = '';
  forSomeoneElse = false;
  loading = false;
  loadingDoctors = false;
  loadingRooms = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  slots = ['09:00', '09:30', '10:30', '11:30', '14:00', '15:30', '16:00'];

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
  ) {
    this.loadDoctors();
    this.loadRooms();
    this.loadPatientsForStaff();
  }

  get selectedDoctor(): string {
    return this.doctors.find((doctor) => doctor.id === this.selectedDoctorId)?.name ?? '';
  }

  submit(): void {
    const user = this.authService.currentUser();
    const roomId = this.selectedRoomId || this.rooms[0]?.id;
    const patientId = user?.role === 'PATIENT' ? user.userId : this.selectedPatientId;
    if (!user || !roomId) {
      this.setMessage('Connectez-vous et creez au moins une salle avant de reserver.', 'error');
      return;
    }

    if (!this.selectedDoctorId) {
      this.setMessage('Aucun medecin backend disponible pour reserver.', 'error');
      return;
    }

    if (!patientId) {
      this.setMessage('Choisissez le patient concerne par le rendez-vous.', 'error');
      return;
    }

    this.loading = true;
    this.setMessage('Reservation en cours...', 'info');
    this.api
      .createAppointment({
        patientId,
        doctorId: this.selectedDoctorId,
        roomId,
        dateTime: `${this.selectedDate}T${this.selectedTime}:00`,
        durationMinutes: 30,
        appointmentType: this.motif,
        description: this.description,
      })
      .pipe(
        timeout(7000),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (appointment) => {
          this.setMessage(`Rendez-vous cree avec succes. Statut: ${appointment.status ?? 'PENDING'}.`, 'success');
          this.refreshSlots();
        },
        error: (error) => {
          const message =
            error.name === 'TimeoutError'
              ? 'Reservation trop longue. Verifiez que le backend, PostgreSQL et MongoDB sont demarres.'
              : 'Reservation impossible. Verifiez le patient, le medecin, la salle et le creneau.';
          this.setMessage(message, 'error');
        },
      });
  }

  get canChoosePatient(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'SECRETARY' || role === 'ADMIN';
  }

  refreshSlots(): void {
    if (!this.selectedDoctorId || !this.selectedDate) {
      return;
    }

    this.api.getAvailableSlots(this.selectedDoctorId, this.selectedDate).subscribe({
      next: (slots) => {
        this.slots = slots.map((slot) => slot.slice(11, 16));
        if (this.slots.length) {
          this.selectedTime = this.slots[0];
        } else {
          this.selectedTime = '';
          this.setMessage('Aucun creneau disponible pour ce medecin a cette date.', 'info');
        }
      },
      error: () => {
        this.slots = [];
        this.selectedTime = '';
        this.setMessage('Impossible de charger les creneaux disponibles.', 'error');
      },
    });
  }

  private loadDoctors(): void {
    this.loadingDoctors = true;
    this.api.getDoctors().pipe(finalize(() => (this.loadingDoctors = false))).subscribe({
      next: (items) => {
        if (!items.length) {
          this.setMessage('Aucun medecin trouve. Ajoutez des lignes dans doctors avec id egal au user DOCTOR.', 'error');
          return;
        }
        this.doctors = items.map((doctor) => this.toDoctorOption(doctor));
        this.selectedDoctorId = this.doctors[0].id;
        this.refreshSlots();
      },
      error: () => {
        this.doctors = [];
        this.selectedDoctorId = 0;
        this.setMessage('Impossible de charger les medecins. Verifiez la table doctors et la liaison avec users.', 'error');
      },
    });
  }

  private loadRooms(): void {
    this.loadingRooms = true;
    this.api.getRooms().pipe(finalize(() => (this.loadingRooms = false))).subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.selectedRoomId = rooms[0]?.id ?? 0;
        if (!rooms.length) {
          this.setMessage('Aucune salle backend disponible pour reserver.', 'error');
        }
      },
      error: () => {
        this.rooms = [];
        this.selectedRoomId = 0;
        this.setMessage('Impossible de charger les salles depuis le backend.', 'error');
      },
    });
  }

  private loadPatientsForStaff(): void {
    if (!this.canChoosePatient) {
      return;
    }

    this.api.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.selectedPatientId = patients[0]?.id ?? 0;
        if (!patients.length) {
          this.setMessage('Aucun patient disponible pour le secretariat.', 'error');
        }
      },
      error: () => {
        this.setMessage('Impossible de charger la liste des patients.', 'error');
      },
    });
  }

  private toDoctorOption(doctor: BackendDoctor): DoctorOption {
    const firstname = doctor.user?.firstname ?? 'Dr.';
    const lastname = doctor.user?.lastname ?? `#${doctor.id}`;
    return {
      id: doctor.id,
      name: `${firstname} ${lastname}`.startsWith('Dr.') ? `${firstname} ${lastname}` : `Dr. ${firstname} ${lastname}`,
      specialty: doctor.specialty ?? 'Medecine generale',
      price: doctor.standardConsultationRate ?? 300,
    };
  }

  private setMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.message = message;
    this.messageType = type;
  }
}
