import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BackendConsultation, MedisyncApiService } from '../../services/medisync-api.service';

interface ConsultationRow {
  id: string;
  date: string;
  doctor: string;
  motif: string;
  notes: string;
  prescriptions: string[];
  files: Record<string, unknown>[];
}

@Component({
  selector: 'app-medical-record',
  imports: [FormsModule],
  templateUrl: './medical-record.html',
})
export class MedicalRecord {
  consultations: ConsultationRow[] = [];
  documents: string[] = [];
  error = '';
  message = '';
  documentMessage = '';
  editingId: string | null = null;
  consultationForm = {
    patientId: 0,
    doctorId: 0,
    observation: '',
    prescriptionsText: '',
  };
  documentForm = {
    consultationId: '',
    fileName: '',
    fileType: 'PDF',
    fileUrl: '',
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
        : user.role === 'PATIENT'
          ? this.api.getPatientMedicalHistory(user.userId)
          : this.api.getConsultationsForPatient(user.userId);

    request.subscribe({
      next: (items) => {
        this.consultations = items.map((consultation) => this.toConsultationRow(consultation));
        this.refreshDocuments();
      },
      error: () => {
        this.consultations = [];
        this.documents = [];
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

  addDocument(): void {
    const user = this.authService.currentUser();
    this.documentMessage = '';

    if (!user || !this.documentForm.fileName) {
      this.documentMessage = 'Renseignez au minimum le nom du fichier.';
      return;
    }

    const metadata = {
      fileName: this.documentForm.fileName,
      fileType: this.documentForm.fileType,
      fileUrl: this.documentForm.fileUrl || this.documentForm.fileName,
      uploadedAt: new Date().toISOString(),
    };

    const request =
      user.role === 'DOCTOR'
        ? this.api.addConsultationFile(this.documentForm.consultationId, metadata)
        : this.api.addPatientDocument(this.consultationForm.patientId || user.userId, metadata, this.consultationForm.doctorId);

    if (user.role === 'DOCTOR' && !this.documentForm.consultationId) {
      this.documentMessage = 'Choisissez une consultation avant d ajouter le fichier.';
      return;
    }

    request.subscribe({
      next: (consultation) => {
        const row = this.toConsultationRow(consultation);
        const exists = this.consultations.some((item) => item.id === row.id);
        this.consultations = exists
          ? this.consultations.map((item) => (item.id === row.id ? row : item))
          : [row, ...this.consultations];
        this.refreshDocuments();
        this.documentForm.fileName = '';
        this.documentForm.fileUrl = '';
        this.documentMessage = 'Document ajoute au dossier.';
      },
      error: () => {
        this.documentMessage = 'Ajout du document impossible. Verifiez vos droits et la consultation.';
      },
    });
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
      files: consultation.files ?? [],
    };
  }

  private refreshDocuments(): void {
    const backendDocuments = this.consultations.flatMap((consultation) =>
      consultation.files.map((file) => String(file['fileName'] ?? file['name'] ?? 'Document medical')),
    );
    if (backendDocuments.length) {
      this.documents = backendDocuments;
    }

    const firstConsultation = this.consultations[0];
    this.documentForm.consultationId = firstConsultation?.id ?? '';
  }
}
