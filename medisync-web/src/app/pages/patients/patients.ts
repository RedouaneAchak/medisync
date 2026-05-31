import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
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
  };

  constructor(
    private readonly api: MedisyncApiService,
    private readonly cdr: ChangeDetectorRef // <-- INJECTED HERE
  ) {}

  ngOnInit(): void {
    this.loadPatients(); // <-- Moved to ngOnInit for best practices
  }

  get filteredPatients() {
    return this.patients.filter((patient) =>
      [patient.name, patient.category, patient.company].join(' ').toLowerCase().includes(this.query.toLowerCase()),
    );
  }

  createPatient(): void {
    this.message = '';
    this.api.createPatient(this.newPatient).subscribe({
      next: (patient) => {
        this.patients = [this.toPatientRow(patient), ...this.patients];
        this.message = 'Compte patient cree avec un mot de passe temporaire cote backend.';
        this.showCreateForm = false;
        this.newPatient = {
          firstname: '',
          lastname: '',
          email: '',
          phone: '',
          ssn: '',
          category: 'ADULT',
          companyName: '',
        };
        this.cdr.detectChanges(); // <-- WAKE UP ANGULAR
      },
      error: () => {
        this.message = 'Creation impossible. Verifiez l email, le numero SSN et vos droits SECRETARY/ADMIN.';
        this.cdr.detectChanges(); // <-- WAKE UP ANGULAR
      },
    });
  }

  private loadPatients(): void {
    this.api.getPatients().subscribe({
      next: (items) => {
        this.patients = items.map((patient) => this.toPatientRow(patient));
        this.cdr.detectChanges(); // <-- WAKE UP ANGULAR
      },
      error: () => {
        this.error = 'Acces reserve au secretariat ou a l administration.';
        this.cdr.detectChanges(); // <-- WAKE UP ANGULAR
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