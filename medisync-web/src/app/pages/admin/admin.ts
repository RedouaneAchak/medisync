import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BackendAppointment,
  BackendDoctor,
  BackendPatient,
  BackendRole,
  BackendRoom,
  BackendUser,
  MedisyncApiService,
} from '../../services/medisync-api.service';

interface AdminDoctorRow {
  id: number;
  name: string;
  specialty: string;
  languages: string;
  price: number;
  initials: string;
}

interface AdminPatientRow {
  name: string;
  category: string;
  phone: string;
  company: string;
  lastVisit: string;
  blood: string;
}

interface AdminAppointmentRow {
  id: number;
  doctor: string;
  patient: string;
  specialty: string;
  date: string;
  time: string;
  room: string;
  type: string;
  status: string;
}

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
})
export class Admin {
  doctors: AdminDoctorRow[] = [];
  patients: AdminPatientRow[] = [];
  appointments: AdminAppointmentRow[] = [];
  users: BackendUser[] = [];
  rooms: BackendRoom[] = [];
  error = '';
  message = '';
  roleOptions: BackendRole[] = ['PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN'];
  newUser = {
    firstname: '',
    lastname: '',
    email: '',
    password: 'ChangeMe123!',
    role: 'PATIENT' as BackendRole,
  };
  newRoom = {
    roomNumber: '',
    equipmentType: '',
  };

  constructor(private readonly api: MedisyncApiService) {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.api.getDoctors().subscribe({
      next: (items) => {
        this.doctors = items.map((doctor) => this.toDoctorCard(doctor));
      },
      error: () => {
        this.error = 'Connectez-vous avec un compte ADMIN pour charger le tableau de bord backend.';
      },
    });

    this.api.getPatients().subscribe({
      next: (items) => {
        this.patients = items.map((patient) => this.toPatientRow(patient));
      },
    });

    this.api.getAppointments().subscribe({
      next: (items) => {
        this.appointments = items.map((appointment) => this.toAppointmentRow(appointment));
      },
    });

    this.api.getAdminUsers().subscribe({
      next: (items) => {
        this.users = items;
      },
    });

    this.api.getRoomsForAdmin().subscribe({
      next: (items) => {
        this.rooms = items;
      },
    });
  }

  createUser(): void {
    this.message = '';
    this.api.createAdminUser(this.newUser).subscribe({
      next: (user) => {
        this.users = [...this.users, user];
        this.message = `Compte ${user.role} cree pour ${user.email}.`;
        this.newUser = {
          firstname: '',
          lastname: '',
          email: '',
          password: 'ChangeMe123!',
          role: 'PATIENT',
        };
        this.loadDashboardData();
      },
      error: () => {
        this.message = 'Creation utilisateur impossible. Verifiez le role, l email et vos droits ADMIN.';
      },
    });
  }

  deleteUser(id: number): void {
    this.message = '';
    this.api.deleteAdminUser(id).subscribe({
      next: () => {
        this.users = this.users.filter((user) => user.id !== id);
        this.message = 'Utilisateur supprime.';
        this.loadDashboardData();
      },
      error: () => {
        this.message = 'Suppression impossible: cet utilisateur peut etre lie a un profil ou a des donnees.';
      },
    });
  }

  createRoom(): void {
    this.message = '';
    this.api.createRoom(this.newRoom).subscribe({
      next: (room) => {
        this.rooms = [...this.rooms, room];
        this.message = `Salle ${room.roomNumber} creee.`;
        this.newRoom = { roomNumber: '', equipmentType: '' };
      },
      error: () => {
        this.message = 'Creation de salle impossible. Verifiez vos droits ADMIN.';
      },
    });
  }

  deleteRoom(id: number): void {
    this.message = '';
    this.api.deleteRoom(id).subscribe({
      next: () => {
        this.rooms = this.rooms.filter((room) => room.id !== id);
        this.message = 'Salle supprimee.';
      },
      error: () => {
        this.message = 'Suppression de salle impossible: elle peut etre liee a un rendez-vous.';
      },
    });
  }

  private toDoctorCard(doctor: BackendDoctor) {
    const firstname = doctor.user?.firstname ?? 'Medecin';
    const lastname = doctor.user?.lastname ?? `#${doctor.id}`;
    return {
      id: doctor.id,
      name: `Dr. ${firstname} ${lastname}`,
      specialty: doctor.specialty ?? 'Medecine generale',
      languages: doctor.spokenLanguages ?? 'Francais, Arabe',
      price: doctor.standardConsultationRate ?? 300,
      initials: `${firstname[0] ?? 'M'}${lastname[0] ?? 'D'}`.toUpperCase(),
    };
  }

  private toPatientRow(patient: BackendPatient) {
    return {
      name: `${patient.firstName ?? patient.user?.firstname ?? ''} ${patient.lastName ?? patient.user?.lastname ?? ''}`.trim(),
      category: patient.category ?? 'ADULT',
      phone: patient.phoneNumber ?? '-',
      company: patient.companyName ?? 'Individuel',
      lastVisit: '-',
      blood: '-',
    };
  }

  private toAppointmentRow(appointment: BackendAppointment) {
    const date = new Date(appointment.dateTime);
    return {
      id: appointment.id,
      doctor: `Dr. ${appointment.doctor?.user?.firstname ?? ''} ${appointment.doctor?.user?.lastname ?? ''}`.trim(),
      patient: `${appointment.patient?.firstName ?? appointment.patient?.user?.firstname ?? ''} ${appointment.patient?.lastName ?? appointment.patient?.user?.lastname ?? ''}`.trim(),
      specialty: appointment.doctor?.specialty ?? 'Consultation',
      date: date.toLocaleDateString('fr-MA'),
      time: date.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }),
      room: appointment.room?.roomNumber ?? '-',
      type: appointment.appointmentType ?? 'Consultation',
      status: appointment.status ?? 'PENDING',
    };
  }
}
