import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
export class Booking implements OnInit {
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
  
  saving = false; // Controls the submit button exactly like Profile
  loadingDoctors = false;
  loadingRooms = false;
  
  // Replaced the old message system with the strict Profile pattern
  error = '';
  success = '';

  slots = ['09:00', '09:30', '10:30', '11:30', '14:00', '15:30', '16:00'];

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef // Prevents the double-click UI bug!
  ) {}

  ngOnInit(): void {
    this.loadDoctors();
    this.loadRooms();
    this.loadPatientsForStaff();
  }

  get selectedDoctor(): string {
    return this.doctors.find((doctor) => doctor.id === this.selectedDoctorId)?.name ?? '';
  }

  submit(): void {
    // Reset messages when they click save
    this.error = '';
    this.success = '';

    const user = this.authService.currentUser();
    const roomId = this.selectedRoomId || this.rooms[0]?.id;
    const patientId = user?.role === 'PATIENT' ? user.userId : this.selectedPatientId;
    
    if (!user || !roomId) {
      this.error = 'Connectez-vous et créez au moins une salle avant de réserver.';
      return;
    }

    if (!this.selectedDoctorId) {
      this.error = 'Aucun médecin backend disponible pour réserver.';
      return;
    }

    if (!patientId) {
      this.error = 'Choisissez le patient concerné par le rendez-vous.';
      return;
    }

    this.saving = true; // Lock the button and start spinner

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
          this.saving = false; // Always unlock the button
          this.cdr.detectChanges(); // Force Angular to draw the result
        }),
      )
      .subscribe({
        next: (appointment) => {
          this.success = `Rendez-vous créé avec succès. Statut: ${appointment.status ?? 'PENDING'}.`;
          this.refreshSlots();
        },
        error: (err: any) => {
          // Bulletproof error extraction exactly like Profile
          if (err.name === 'TimeoutError') {
            this.error = 'Réservation trop longue. Vérifiez que le backend est démarré.';
          } else if (err.error && typeof err.error === 'string') {
            this.error = err.error;
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else {
            this.error = 'Réservation impossible. Ce créneau ou cette salle est peut-être déjà pris.';
          }
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

    this.error = '';
    this.api.getAvailableSlots(this.selectedDoctorId, this.selectedDate).subscribe({
      next: (slots) => {
        this.slots = slots.map((slot) => slot.slice(11, 16));
        if (this.slots.length) {
          this.selectedTime = this.slots[0];
        } else {
          this.selectedTime = '';
          this.error = 'Aucun créneau disponible pour ce médecin à cette date.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.slots = [];
        this.selectedTime = '';
        this.error = 'Impossible de charger les créneaux disponibles.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadDoctors(): void {
    this.loadingDoctors = true;
    this.api.getDoctors().pipe(finalize(() => (this.loadingDoctors = false))).subscribe({
      next: (items) => {
        if (!items.length) {
          this.error = 'Aucun médecin trouvé.';
          this.cdr.detectChanges();
          return;
        }
        this.doctors = items.map((doctor) => this.toDoctorOption(doctor));
        this.selectedDoctorId = this.doctors[0].id;
        this.refreshSlots();
        this.cdr.detectChanges();
      },
      error: () => {
        this.doctors = [];
        this.selectedDoctorId = 0;
        this.error = 'Impossible de charger les médecins.';
        this.cdr.detectChanges();
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
          this.error = 'Aucune salle backend disponible pour réserver.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.rooms = [];
        this.selectedRoomId = 0;
        this.error = 'Impossible de charger les salles depuis le backend.';
        this.cdr.detectChanges();
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
          this.error = 'Aucun patient disponible pour le secrétariat.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Impossible de charger la liste des patients.';
        this.cdr.detectChanges();
      },
    });
  }

  private toDoctorOption(doctor: BackendDoctor): DoctorOption {
    const firstname = doctor.user?.firstname ?? 'Dr.';
    const lastname = doctor.user?.lastname ?? `#${doctor.id}`;
    return {
      id: doctor.id,
      name: `${firstname} ${lastname}`.startsWith('Dr.') ? `${firstname} ${lastname}` : `Dr. ${firstname} ${lastname}`,
      specialty: doctor.specialty ?? 'Médecine générale',
      price: doctor.standardConsultationRate ?? 300,
    };
  }
}