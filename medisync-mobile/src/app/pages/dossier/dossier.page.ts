import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
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
  ) {}

  ionViewWillEnter(): void {
    this.loadMedicalRecord();
  }

  downloadOrdo(ordonnance: OrdonnanceCard): void {
    alert(`Téléchargement : ${ordonnance.title}`);
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
      }));

    this.treatments = Array.from(new Set(ordered.flatMap((consultation) => consultation.prescriptions ?? []))).map(
      (prescription) => ({
        name: prescription,
        dose: 'Voir ordonnance',
        frequency: 'Suivi en cours',
      }),
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
}
