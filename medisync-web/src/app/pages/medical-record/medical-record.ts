import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BackendAppointment, BackendConsultation, BackendPatient, MedisyncApiService } from '../../services/medisync-api.service';

interface ConsultationRow {
  id: string;
  date: string;
  doctor: string;
  motif: string;
  notes: string;
  prescriptions: string[];
  files: Record<string, unknown>[];
}

interface DoctorPatientOption {
  id: number;
  name: string;
  appointmentLabel: string;
}

@Component({
  selector: 'app-medical-record',
  imports: [FormsModule],
  templateUrl: './medical-record.html',
})
export class MedicalRecord implements OnInit {
  consultations: ConsultationRow[] = [];
  documents: string[] = [];
  editingId: string | null = null;
  doctorPatients: DoctorPatientOption[] = [];
  selectedDoctorPatientId = 0;
  
  // Variables pour la recherche par NOM
  searchQuery = '';
  searchResults: { id: number; name: string; info: string }[] = [];
  isSearching = false;
  
  // Forms
  consultationForm = {
    patientId: 0,
    doctorId: 0,
    observation: '',
    prescriptionsText: '',
  };
  
  selectedFile: File | null = null;
  documentForm = {
    consultationId: '',
    fileType: 'PDF',
  };

  loadingData = false;
  loadingPatients = false;
  savingConsultation = false;
  savingDocument = false;

  formError = '';
  formSuccess = '';
  docError = '';
  docSuccess = '';

  constructor(
    private readonly api: MedisyncApiService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.consultationForm.patientId = user.role === 'PATIENT' ? user.userId : 0;
    this.consultationForm.doctorId = user.role === 'DOCTOR' ? user.userId : 0;

    if (user.role === 'DOCTOR') {
      this.loadDoctorPatients(user.userId);
      return;
    }

    this.loadMedicalHistory(user);
  }

  get isDoctorView(): boolean {
    return this.authService.currentUser()?.role === 'DOCTOR';
  }

  // Action lancée par le bouton "Chercher"
  searchPatientByName(): void {
    if (!this.searchQuery || this.searchQuery.trim().length < 2) {
      this.formError = 'Veuillez entrer au moins 2 caractères.';
      this.cdr.detectChanges();
      return;
    }

    this.isSearching = true;
    this.formError = '';
    this.searchResults = [];

    this.api.searchPatientsByName(this.searchQuery).pipe(
      finalize(() => {
        this.isSearching = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (patients) => {
        this.searchResults = patients.map(p => ({
          id: p.id,
          name: `${p.firstName ?? p.user?.firstname ?? ''} ${p.lastName ?? p.user?.lastname ?? ''}`.trim(),
          info: `SSN: ${p.socialSecurityNumber ?? 'N/A'} - Tel: ${p.phoneNumber ?? 'N/A'}`
        }));
        
        if (this.searchResults.length === 0) {
          this.formError = 'Aucun patient trouvé avec ce nom.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.formError = 'Erreur de recherche. Le compte DOCTOR n a peut-être pas accès à cette route.';
        this.cdr.detectChanges();
      }
    });
  }

  // Action lancée quand le médecin clique sur un résultat
  selectSearchedPatient(patientId: number, patientName: string): void {
    this.consultationForm.patientId = patientId;
    this.selectedDoctorPatientId = 0; // Désélectionne le planning
    this.searchQuery = patientName; // Laisse le nom propre dans l'input
    this.searchResults = []; // Cache les résultats
    
    this.loadConsultationsForPatient(patientId);
  }

  private loadMedicalHistory(user: any): void {
    this.loadingData = true;
    this.formError = '';

    const request =
      user.role === 'DOCTOR'
        ? this.api.getConsultationsForDoctor(user.userId)
        : user.role === 'PATIENT'
          ? this.api.getPatientMedicalHistory(user.userId)
          : this.api.getConsultationsForPatient(user.userId);

    request.pipe(
      finalize(() => {
        this.loadingData = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (items) => {
        this.consultations = items.map((consultation) => this.toConsultationRow(consultation));
        this.refreshDocuments();
        this.cdr.detectChanges(); 
      },
      error: () => {
        this.consultations = [];
        this.documents = [];
        this.formError = 'Aucune consultation backend chargée pour ce patient.';
        this.cdr.detectChanges();
      },
    });
  }

  get canManageConsultations(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'DOCTOR' || role === 'ADMIN';
  }

  saveConsultation(): void {
    this.formError = '';
    this.formSuccess = '';

    const payload = {
      patientId: this.consultationForm.patientId,
      doctorId: this.consultationForm.doctorId,
      observation: this.consultationForm.observation,
      prescriptions: this.prescriptions,
    };

    if (!payload.patientId || !payload.doctorId) {
      this.formError = 'Renseignez le patient et le médecin.';
      return;
    }

    this.savingConsultation = true;

    const request = this.editingId
      ? this.api.updateConsultation(this.editingId, {
          observation: payload.observation,
          prescriptions: payload.prescriptions,
        })
      : this.api.createConsultation(payload);

    request.pipe(
      finalize(() => {
        this.savingConsultation = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (consultation) => {
        const row = this.toConsultationRow(consultation);
        this.consultations = this.editingId
          ? this.consultations.map((item) => (item.id === row.id ? row : item))
          : [row, ...this.consultations];
        
        this.formSuccess = this.editingId ? 'Consultation mise à jour.' : 'Consultation créée avec succès.';
        this.editingId = null;
        this.consultationForm.observation = '';
        this.consultationForm.prescriptionsText = '';
        this.refreshDocuments();
        this.cdr.detectChanges(); 
      },
      error: (err: any) => {
        if (err.error && typeof err.error === 'string') {
          this.formError = err.error;
        } else if (err.error?.message) {
          this.formError = err.error.message;
        } else {
          this.formError = 'Enregistrement impossible. Vérifiez vos droits et les identifiants.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  editConsultation(consultation: ConsultationRow): void {
    this.editingId = consultation.id;
    this.consultationForm.observation = consultation.notes;
    this.consultationForm.prescriptionsText = consultation.prescriptions.join('\n');
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    this.cdr.detectChanges(); 
  }

  onDoctorPatientChange(): void {
    if (!this.selectedDoctorPatientId) {
      return;
    }

    this.searchQuery = ''; // Vide la recherche manuelle si on utilise le menu
    this.consultationForm.patientId = this.selectedDoctorPatientId;
    this.loadConsultationsForPatient(this.selectedDoctorPatientId);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    
    if (file) {
      const MAX_SIZE_BYTES = 52428800; 

      if (file.size > MAX_SIZE_BYTES) {
        this.docError = `Le fichier est trop volumineux (${(file.size / 1048576).toFixed(1)} MB). La taille maximale est de 50 MB.`;
        this.selectedFile = null; 
        this.cdr.detectChanges();
        return;
      }

      this.selectedFile = file;
      this.docError = ''; 
      this.cdr.detectChanges(); 
    }
  }

  addDocument(): void {
    this.docError = '';
    this.docSuccess = '';
    
    const user = this.authService.currentUser();
    
    if (!user || !this.selectedFile) {
      this.docError = 'Veuillez sélectionner un fichier sur votre ordinateur.';
      return;
    }

    if (user.role === 'DOCTOR' && !this.documentForm.consultationId) {
      this.docError = 'Choisissez une consultation avant d\'ajouter le fichier.';
      return;
    }

    this.savingDocument = true;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('fileType', this.documentForm.fileType);
    
    if (user.role === 'PATIENT' || user.role === 'ADMIN') {
      formData.append('doctorId', String(this.consultationForm.doctorId));
    }

    const request =
      user.role === 'DOCTOR'
        ? (this.api as any).uploadConsultationFile(this.documentForm.consultationId, formData)
        : (this.api as any).uploadPatientDocument(this.consultationForm.patientId || user.userId, formData);

    request.pipe(
      finalize(() => {
        this.savingDocument = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response: any) => {
        if (response && response.id) {
          const row = this.toConsultationRow(response as BackendConsultation);
          const exists = this.consultations.some((item) => item.id === row.id);
          this.consultations = exists
            ? this.consultations.map((item) => (item.id === row.id ? row : item))
            : [row, ...this.consultations];
          this.refreshDocuments();
        } else {
          if (this.selectedFile) {
             this.documents.unshift(this.selectedFile.name);
          }
        }
        
        this.selectedFile = null;
        this.docSuccess = 'Fichier uploadé avec succès.';
        this.cdr.detectChanges(); 
      },
      error: (err: any) => {
        if (err.error && typeof err.error === 'string') {
          this.docError = err.error;
        } else if (err.error?.message) {
          this.docError = err.error.message;
        } else {
          this.docError = 'Upload du document impossible. Vérifiez la taille du fichier.';
        }
        this.cdr.detectChanges();
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
      date: consultation.createdAt ? consultation.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      doctor: consultation.doctorId ? `Médecin #${consultation.doctorId}` : 'Médecin',
      motif: 'Consultation',
      notes: consultation.observation ?? '',
      prescriptions: consultation.prescriptions ?? [],
      files: consultation.files ?? [],
    };
  }

  private refreshDocuments(): void {
    const backendDocuments = this.consultations.flatMap((consultation) =>
      consultation.files.map((file) => String(file['fileName'] ?? file['name'] ?? 'Document médical')),
    );
    if (backendDocuments.length) {
      this.documents = backendDocuments;
    }

    const firstConsultation = this.consultations[0];
    if (firstConsultation && !this.documentForm.consultationId) {
      this.documentForm.consultationId = firstConsultation.id;
    }
  }

  private loadDoctorPatients(doctorId: number): void {
    this.loadingPatients = true;
    this.formError = '';

    const from = new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().slice(0, 19);
    const to = new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 19);

    this.api
      .getDoctorAppointments(doctorId, from, to)
      .pipe(
        finalize(() => {
          this.loadingPatients = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (appointments) => {
          this.doctorPatients = this.toDoctorPatientOptions(appointments);
          this.selectedDoctorPatientId = this.doctorPatients[0]?.id ?? 0;
          this.consultationForm.patientId = this.selectedDoctorPatientId;

          if (!this.selectedDoctorPatientId) {
            this.consultations = [];
            this.documents = [];
            this.formError = 'Aucun patient n est encore rattache a ce medecin dans le planning.';
            this.cdr.detectChanges();
            return;
          }

          this.loadConsultationsForPatient(this.selectedDoctorPatientId);
        },
        error: () => {
          this.formError = 'Impossible de charger les patients du planning medecin.';
          this.cdr.detectChanges();
        },
      });
  }

  private loadConsultationsForPatient(patientId: number): void {
    this.loadingData = true;
    this.formError = '';

    this.api
      .getConsultationsForPatient(patientId)
      .pipe(
        finalize(() => {
          this.loadingData = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (items) => {
          this.consultations = items.map((consultation) => this.toConsultationRow(consultation));
          this.refreshDocuments();
          if (!items.length) {
            this.formSuccess = '';
            this.formError = 'Aucune consultation enregistree pour ce patient.';
          }
          this.cdr.detectChanges(); 
        },
        error: () => {
          this.consultations = [];
          this.documents = [];
          this.formError = 'Chargement du dossier patient impossible.';
          this.cdr.detectChanges();
        },
      });
  }

  private toDoctorPatientOptions(appointments: BackendAppointment[]): DoctorPatientOption[] {
    const uniquePatients = new Map<number, DoctorPatientOption>();

    appointments.forEach((appointment) => {
      const patientId = appointment.patient?.id;
      if (!patientId || uniquePatients.has(patientId)) {
        return;
      }

      const firstName = appointment.patient?.firstName ?? appointment.patient?.user?.firstname ?? 'Patient';
      const lastName = appointment.patient?.lastName ?? appointment.patient?.user?.lastname ?? `#${patientId}`;
      const labelDate = new Date(appointment.dateTime).toLocaleDateString('fr-MA');

      uniquePatients.set(patientId, {
        id: patientId,
        name: `${firstName} ${lastName}`.trim(),
        appointmentLabel: `${appointment.appointmentType ?? 'Consultation'} · ${labelDate}`,
      });
    });

    return Array.from(uniquePatients.values());
  }
}