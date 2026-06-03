import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BackendAppointment,
  BackendConsultation,
  BackendDoctor,
  BackendPatient,
  MedisyncApiService,
} from '../../services/medisync-api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-consultations',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './consultations.html',
})
export class Consultations implements OnInit {
  consultations: BackendConsultation[] = [];
  patients: BackendPatient[] = [];
  doctors: BackendDoctor[] = [];
  appointments: BackendAppointment[] = [];
  loading = true;
  error = '';
  message = '';
  showCreateForm = false;
  patientQuery = '';
  doctorQuery = '';
  appointmentQuery = '';
  form = {
    patientId: 0,
    doctorId: 0,
    appointmentId: 0,
    observation: '',
    prescriptionsText: '',
  };

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadConsultations();
    this.loadLookups();
  }

  get filteredPatients(): BackendPatient[] {
    const query = this.patientQuery.trim().toLowerCase();
    return this.patients.filter((patient) => this.patientName(patient).toLowerCase().includes(query));
  }

  get filteredDoctors(): BackendDoctor[] {
    const query = this.doctorQuery.trim().toLowerCase();
    return this.doctors.filter((doctor) => this.doctorName(doctor).toLowerCase().includes(query));
  }

  get filteredAppointments(): BackendAppointment[] {
    const query = this.appointmentQuery.trim().toLowerCase();
    return this.appointments.filter((appointment) => {
      const matchesSelection =
        (!this.form.patientId || appointment.patient?.id === this.form.patientId) &&
        (!this.form.doctorId || appointment.doctor?.id === this.form.doctorId) &&
        !appointment.invoice;
      return matchesSelection && this.appointmentLabel(appointment).toLowerCase().includes(query);
    });
  }

  selectPatient(patient: BackendPatient): void {
    this.form.patientId = patient.id;
    this.patientQuery = this.patientName(patient);
    this.form.appointmentId = 0;
  }

  selectDoctor(doctor: BackendDoctor): void {
    this.form.doctorId = doctor.id;
    this.doctorQuery = this.doctorName(doctor);
    this.form.appointmentId = 0;
  }

  selectAppointment(appointment: BackendAppointment): void {
    this.form.appointmentId = appointment.id;
    this.appointmentQuery = this.appointmentLabel(appointment);
    if (appointment.patient) {
      this.selectPatient(appointment.patient);
    }
    if (appointment.doctor) {
      this.selectDoctor(appointment.doctor);
    }
  }

  createConsultation(): void {
    this.message = '';
    if (!this.form.patientId || !this.form.doctorId || !this.form.appointmentId || !this.form.observation.trim()) {
      this.message = 'Choisissez un patient, un medecin, un RDV et saisissez les notes de consultation.';
      this.cdr.detectChanges();
      return;
    }

    const prescriptions = this.form.prescriptionsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    this.api
      .createConsultation({
        patientId: this.form.patientId,
        doctorId: this.form.doctorId,
        appointmentId: this.form.appointmentId,
        observation: this.form.observation.trim(),
        prescriptions,
      })
      .subscribe({
        next: (consultation) => {
          this.consultations = [consultation, ...this.consultations];
          this.message = 'Consultation enregistree et facture ajoutee au dossier patient.';
          this.resetForm();
          this.loadLookups();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Erreur creation consultation', err);
          this.message = 'Creation impossible. Verifiez le patient, le medecin, le RDV et vos droits.';
          this.cdr.detectChanges();
        },
      });
  }

  patientName(patient?: BackendPatient): string {
    if (!patient) {
      return 'Patient inconnu';
    }
    return `${patient.firstName ?? patient.user?.firstname ?? ''} ${patient.lastName ?? patient.user?.lastname ?? ''}`.trim();
  }

  doctorName(doctor?: BackendDoctor): string {
    if (!doctor) {
      return 'Medecin inconnu';
    }
    return `Dr ${doctor.user?.firstname ?? ''} ${doctor.user?.lastname ?? ''}`.trim();
  }

  appointmentLabel(appointment?: BackendAppointment): string {
    if (!appointment) {
      return 'RDV inconnu';
    }
    const date = new Date(appointment.dateTime);
    return `${this.patientName(appointment.patient)} avec ${this.doctorName(appointment.doctor)} - ${date.toLocaleDateString('fr-MA')} ${date.toLocaleTimeString('fr-MA', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  consultationPatientName(consultation: BackendConsultation): string {
    return this.patientName(this.patients.find((patient) => patient.id === consultation.patientId));
  }

  consultationDoctorName(consultation: BackendConsultation): string {
    return this.doctorName(this.doctors.find((doctor) => doctor.id === consultation.doctorId));
  }

  consultationAppointmentLabel(consultation: BackendConsultation): string {
    return this.appointmentLabel(this.appointments.find((appointment) => appointment.id === consultation.appointmentId));
  }

  downloadPdf(consultation: BackendConsultation): void {
    const lines = [
      'MediSync - Consultation',
      `Patient: ${this.consultationPatientName(consultation)}`,
      `Medecin: ${this.consultationDoctorName(consultation)}`,
      `RDV: ${this.consultationAppointmentLabel(consultation)}`,
      `Date: ${consultation.createdAt ? new Date(consultation.createdAt).toLocaleString('fr-MA') : '-'}`,
      '',
      'Observation:',
      consultation.observation ?? '',
      '',
      'Prescriptions:',
      ...(consultation.prescriptions?.length ? consultation.prescriptions : ['-']),
    ];
    const pdf = this.buildSimplePdf(lines);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consultation-${consultation.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadConsultations(): void {
    this.loading = true;
    const user = this.authService.currentUser();
    const request =
      user?.role === 'DOCTOR'
        ? this.api.getConsultationsForDoctor(user.userId)
        : this.api.getConsultations();

    request.subscribe({
      next: (data) => {
        this.consultations = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement consultations', err);
        this.error = 'Impossible de charger les consultations depuis la base de donnees.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadLookups(): void {
    const user = this.authService.currentUser();
    if (user?.role !== 'DOCTOR') {
      this.api.getPatients().subscribe({
        next: (patients) => {
          this.patients = patients;
          this.cdr.detectChanges();
        },
      });
    }
    this.api.getDoctors().subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        if (user?.role === 'DOCTOR') {
          const currentDoctor = doctors.find((doctor) => doctor.id === user.userId);
          if (currentDoctor) {
            this.selectDoctor(currentDoctor);
          }
        }
        this.cdr.detectChanges();
      },
    });
    this.api.getAppointments().subscribe({
      next: (appointments) => {
        this.appointments =
          user?.role === 'DOCTOR'
            ? appointments.filter((appointment) => appointment.doctor?.id === user.userId)
            : appointments;
        if (user?.role === 'DOCTOR') {
          this.patients = this.appointments
            .map((appointment) => appointment.patient)
            .filter((patient): patient is BackendPatient => Boolean(patient))
            .filter((patient, index, all) => all.findIndex((item) => item.id === patient.id) === index);
        }
        this.cdr.detectChanges();
      },
    });
  }

  private resetForm(): void {
    this.showCreateForm = false;
    this.patientQuery = '';
    this.doctorQuery = '';
    this.appointmentQuery = '';
    this.form = {
      patientId: 0,
      doctorId: 0,
      appointmentId: 0,
      observation: '',
      prescriptionsText: '',
    };
  }

  private buildSimplePdf(lines: string[]): string {
    const content = lines
      .flatMap((line) => this.wrapLine(line, 88))
      .map((line, index) => `BT /F1 11 Tf 50 ${780 - index * 16} Td (${this.escapePdf(line)}) Tj ET`)
      .join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    }
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets.slice(1)) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
  }

  private wrapLine(line: string, length: number): string[] {
    if (line.length <= length) {
      return [line];
    }
    const result: string[] = [];
    for (let i = 0; i < line.length; i += length) {
      result.push(line.slice(i, i + length));
    }
    return result;
  }

  private escapePdf(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
