import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { consultations } from '../../data/medisync-data';
import { AuthService } from '../../services/auth.service';
import { BackendConsultation, MedisyncApiService } from '../../services/medisync-api.service';

interface ConsultationRow {
  id: string;
  date: string;
  doctor: string;
  motif: string;
  notes: string;
  prescriptions: string[];
}

@Component({
  selector: 'app-medical-record',
  imports: [FormsModule],
  templateUrl: './medical-record.html',
})
export class MedicalRecord {
  consultations: ConsultationRow[] = consultations.map((consultation, index) => ({
    id: `demo-${index}`,
    ...consultation,
  }));
  documents = ['Analyse sang.pdf', 'Radio thorax.jpg', 'ECG mars 2026.pdf'];
  error = '';
  message = '';
  editingId: string | null = null;
  consultationForm = {
    patientId: 0,
    doctorId: 0,
    observation: '',
    prescriptionsText: '',
  };

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
  ) {
    const user = this.authService.currentUser();
    if (!user) {
      return;
    }

    this.consultationForm.patientId = user.role === 'PATIENT' ? user.userId : 0;
    this.consultationForm.doctorId = user.role === 'DOCTOR' ? user.userId : 0;

    const request =
      user.role === 'DOCTOR'
        ? this.api.getConsultationsForDoctor(user.userId)
        : this.api.getConsultationsForPatient(user.userId);

    request.subscribe({
      next: (items) => {
        this.consultations = items.map((consultation) => this.toConsultationRow(consultation));
      },
      error: () => {
        this.error = 'Aucune consultation backend chargee pour ce patient.';
      },
    });
  }

  get canManageConsultations(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'DOCTOR' || role === 'ADMIN';
  }

  saveConsultation(): void {
    const payload = {
      patientId: this.consultationForm.patientId,
      doctorId: this.consultationForm.doctorId,
      observation: this.consultationForm.observation,
      prescriptions: this.prescriptions,
    };

    if (!payload.patientId || !payload.doctorId) {
      this.message = 'Renseignez le patient et le medecin.';
      return;
    }

    const request = this.editingId
      ? this.api.updateConsultation(this.editingId, {
          observation: payload.observation,
          prescriptions: payload.prescriptions,
        })
      : this.api.createConsultation(payload);

    request.subscribe({
      next: (consultation) => {
        const row = this.toConsultationRow(consultation);
        this.consultations = this.editingId
          ? this.consultations.map((item) => (item.id === row.id ? row : item))
          : [row, ...this.consultations];
        this.message = this.editingId ? 'Consultation mise a jour.' : 'Consultation creee.';
        this.editingId = null;
        this.consultationForm.observation = '';
        this.consultationForm.prescriptionsText = '';
      },
      error: () => {
        this.message = 'Enregistrement impossible. Verifiez vos droits et les identifiants.';
      },
    });
  }

  editConsultation(consultation: ConsultationRow): void {
    this.editingId = consultation.id;
    this.consultationForm.observation = consultation.notes;
    this.consultationForm.prescriptionsText = consultation.prescriptions.join('\n');
  }

  private get prescriptions(): string[] {
    return this.consultationForm.prescriptionsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private toConsultationRow(consultation: BackendConsultation): ConsultationRow {
    return {
      id: consultation.id,
      date: '-',
      doctor: consultation.doctorId ? `Medecin #${consultation.doctorId}` : 'Medecin',
      motif: 'Consultation',
      notes: consultation.observation ?? '',
      prescriptions: consultation.prescriptions ?? [],
    };
  }
}
