import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { LocalReminderService } from '../../services/local-reminder.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendConsultation, BackendConsultationFile, BackendPatient } from '../../services/medisync.models';

interface ConsultationCard {
  date: string;
  doctor: string;
  motif: string;
  type: string;
}

interface OrdonnanceCard {
  title: string;
  date: string;
  doctor: string;
  prescriptions: string[];
  observation: string;
}

interface TreatmentCard {
  name: string;
  dose: string;
  frequency: string;
}

interface DocumentCard {
  name: string;
  date: string;
  icon: string;
}

@Component({
  selector: 'app-dossier',
  templateUrl: './dossier.page.html',
  styleUrls: ['./dossier.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent],
})
export class DossierPage {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  patientName = 'Patient MediSync';
  patientMeta = 'Catégorie patient';
  patientPhone = 'Téléphone indisponible';
  patientInitials = 'MS';
  patientAllergies = 'Aucune allergie renseignée';
  patientAntecedents = 'Aucun antécédent renseigné';
  patientTreatmentsSummary = 'Aucun traitement saisi dans le profil';
  consultations: ConsultationCard[] = [];
  ordonnances: OrdonnanceCard[] = [];
  treatments: TreatmentCard[] = [];
  documents: DocumentCard[] = [];
  error = '';
  uploadMessage = '';
  selectedFile: File | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
    private readonly reminderService: LocalReminderService,
  ) {}

  ionViewWillEnter(): void {
    this.loadMedicalRecord();
  }

  downloadOrdo(ordonnance: OrdonnanceCard): void {
    const prescriptions = ordonnance.prescriptions.length
      ? ordonnance.prescriptions.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')
      : '<li>Aucune prescription renseignée</li>';

    const documentHtml = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${this.escapeHtml(ordonnance.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
      h1 { margin-bottom: 8px; }
      .meta { color: #4b5563; margin-bottom: 24px; }
      .box { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>
    <h1>${this.escapeHtml(ordonnance.title)}</h1>
    <div class="meta">${this.escapeHtml(ordonnance.date)} · ${this.escapeHtml(ordonnance.doctor)}</div>
    <div class="box">
      <strong>Observation</strong>
      <p>${this.escapeHtml(ordonnance.observation || 'Compte rendu non renseigné.')}</p>
    </div>
    <div class="box">
      <strong>Prescription</strong>
      <ul>${prescriptions}</ul>
    </div>
  </body>
</html>`;

    const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${ordonnance.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'ordonnance'}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      this.uploadMessage = 'Le document dépasse 20 Mo.';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.uploadDocument();
  }

  private loadMedicalRecord(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.authService.logout();
      return;
    }

    this.error = '';
    forkJoin({
      profile: this.api.getPatientProfile(user.userId),
      history: this.api.getPatientMedicalHistory(user.userId),
    }).subscribe({
      next: ({ profile, history }: { profile: BackendPatient; history: BackendConsultation[] }) => {
        this.applyProfile(profile);
        this.applyHistory(history);
        void this.reminderService.syncMedicationReminders(history);
      },
      error: () => {
        this.error = 'Impossible de charger votre dossier médical.';
      },
    });
  }

  private uploadDocument(): void {
    const user = this.authService.currentUser();
    if (!user || !this.selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('fileType', this.inferFileType(this.selectedFile.name));
    formData.append('doctorId', '0');

    this.api.uploadPatientDocument(user.userId, formData).subscribe({
      next: () => {
        this.uploadMessage = `${this.selectedFile?.name ?? 'Document'} envoyé avec succès.`;
        this.selectedFile = null;
        this.loadMedicalRecord();
      },
      error: () => {
        this.uploadMessage = 'Upload du document impossible.';
      },
    });
  }

  private applyProfile(profile: BackendPatient): void {
    const firstName = profile.firstName ?? profile.user?.firstname ?? 'Patient';
    const lastName = profile.lastName ?? profile.user?.lastname ?? 'MediSync';
    this.patientName = `${firstName} ${lastName}`.trim();
    this.patientMeta = `${profile.category ?? 'PATIENT'}${profile.companyName ? ` • ${profile.companyName}` : ''}`;
    this.patientPhone = profile.phoneNumber ?? 'Téléphone non renseigné';
    this.patientInitials = `${firstName[0] ?? 'M'}${lastName[0] ?? 'S'}`.toUpperCase();
    this.patientAllergies = profile.allergies?.trim() || 'Aucune allergie renseignée';
    this.patientAntecedents = profile.medicalAntecedents?.trim() || 'Aucun antécédent renseigné';
    this.patientTreatmentsSummary = profile.currentTreatments?.trim() || 'Aucun traitement saisi dans le profil';
  }

  private applyHistory(history: BackendConsultation[]): void {
    const ordered = [...history].sort((left, right) => {
      const leftDate = new Date(left.createdAt ?? '').getTime();
      const rightDate = new Date(right.createdAt ?? '').getTime();
      return rightDate - leftDate;
    });

    this.consultations = ordered.map((consultation) => ({
      date: this.formatDate(consultation.createdAt),
      doctor: consultation.doctorId ? `Médecin #${consultation.doctorId}` : 'Médecin',
      motif: consultation.observation ?? 'Compte rendu médical',
      type: consultation.prescriptions?.length ? 'Prescription' : 'Suivi',
    }));

    this.ordonnances = ordered
      .filter((consultation) => (consultation.prescriptions?.length ?? 0) > 0)
      .map((consultation) => ({
        title: `Ordonnance — ${consultation.prescriptions?.length ?? 0} prescription(s)`,
        date: this.formatDate(consultation.createdAt),
        doctor: consultation.doctorId ? `Médecin #${consultation.doctorId}` : 'Médecin',
        prescriptions: consultation.prescriptions ?? [],
        observation: consultation.observation ?? 'Compte rendu médical',
      }));

    this.treatments = Array.from(new Set(ordered.flatMap((consultation) => consultation.prescriptions ?? []))).map(
      (prescription) => {
        const structured = ordered
          .flatMap((consultation) => consultation.prescriptionItems ?? [])
          .find((item) => item.medicationName === prescription);
        return {
          name: prescription,
          dose: structured?.dosage ?? 'Voir ordonnance',
          frequency: structured?.frequency ?? 'Suivi en cours',
        };
      },
    );

    this.documents = ordered.flatMap((consultation) => (consultation.files ?? []).map((file) => this.toDocumentCard(file)));
  }

  private toDocumentCard(file: BackendConsultationFile): DocumentCard {
    const fileType = (file.fileType ?? '').toUpperCase();
    return {
      name: file.fileName ?? 'Document médical',
      date: this.formatDate(file.uploadedAt),
      icon: fileType === 'IMAGE' ? '🖼️' : fileType === 'LAB' ? '🧪' : fileType === 'DICOM' ? '🫁' : '📄',
    };
  }

  private inferFileType(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return 'IMAGE';
    }
    if (lower.endsWith('.dcm')) {
      return 'DICOM';
    }
    return 'PDF';
  }

  private formatDate(value?: string): string {
    if (!value) {
      return 'Date indisponible';
    }
    const date = new Date(value);
    return date.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
