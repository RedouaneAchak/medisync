import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackendPatient, MedisyncApiService } from '../../services/medisync-api.service';

interface PatientRow {
  name: string;
  category: string;
  phone: string;
  company: string;
  lastVisit: string;
  blood: string;
}

@Component({
  selector: 'app-patients',
  imports: [FormsModule],
  templateUrl: './patients.html',
})
export class Patients implements OnInit {
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,72}$/;

  patients: PatientRow[] = [];
  query = '';
  error = '';
  message = '';
  showCreateForm = false;
  categories = ['ADULT', 'MINOR', 'CORPORATE'];
  newPatient = {
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    ssn: '',
    category: 'ADULT',
    companyName: '',
    password: '',
  };

  constructor(
    private readonly api: MedisyncApiService,
    private readonly cdr: ChangeDetectorRef // 1. Injection du ChangeDetectorRef
  ) {}

  // 2. Déplacement du chargement initial dans ngOnInit
  ngOnInit(): void {
    this.loadPatients();
  }

  get filteredPatients() {
    return this.patients.filter((patient) =>
      [patient.name, patient.category, patient.company].join(' ').toLowerCase().includes(this.query.toLowerCase()),
    );
  }

  createPatient(): void {
    this.message = '';
    const email = this.newPatient.email.trim().toLowerCase();

    if (!Patients.EMAIL_PATTERN.test(email)) {
      this.message = 'Veuillez saisir une adresse email valide.';
      this.cdr.detectChanges();
      return;
    }

    if (!Patients.PASSWORD_PATTERN.test(this.newPatient.password)) {
      this.message =
        'Mot de passe requis: 10 caracteres minimum avec majuscule, minuscule, chiffre et caractere special.';
      this.cdr.detectChanges();
      return;
    }

    const payload = { ...this.newPatient, email };
    this.api.createPatient(payload).subscribe({
      next: (patient) => {
        this.patients = [this.toPatientRow(patient), ...this.patients];
        this.message = 'Compte patient cree avec le mot de passe saisi.';
        this.showCreateForm = false;
        this.newPatient = {
          firstname: '',
          lastname: '',
          email: '',
          phone: '',
          ssn: '',
          category: 'ADULT',
          companyName: '',
          password: '',
        };
        this.cdr.detectChanges(); // 3. Forçage du rafraîchissement
      },
      error: () => {
        this.message = 'Creation impossible. Verifiez l email, le numero SSN et vos droits SECRETARY/ADMIN.';
        this.cdr.detectChanges(); // 3. Forçage du rafraîchissement
      },
    });
  }

  private loadPatients(): void {
    this.api.getPatients().subscribe({
      next: (items) => {
        this.patients = items.map((patient) => this.toPatientRow(patient));
        this.cdr.detectChanges(); // 3. Forçage du rafraîchissement
      },
      error: () => {
        this.error = 'Acces reserve au secretariat ou a l administration.';
        this.cdr.detectChanges(); // 3. Forçage du rafraîchissement
      },
    });
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
}
