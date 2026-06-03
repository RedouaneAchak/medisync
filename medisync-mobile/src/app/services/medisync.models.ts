export interface AuthUser {
  userId: number;
  firstname: string;
  lastname: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';
  permissions?: string[];
}

export interface AuthResponse extends AuthUser {
  token: string;
  twoFactorEnabled?: boolean;
  requiresTwoFactorSetup?: boolean;
}

export interface BackendUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  extraPermissions?: string[];
  effectivePermissions?: string[];
}

export interface BackendDoctor {
  id: number;
  user?: BackendUser;
  specialty?: string;
  bio?: string;
  spokenLanguages?: string;
  standardConsultationRate?: number;
  availabilityStart?: string;
  availabilityEnd?: string;
  workingDays?: string;
  defaultSlotMinutes?: number;
}

export interface BackendPatient {
  id: number;
  user?: BackendUser;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  socialSecurityNumber?: string;
  category?: string;
  companyName?: string;
  allergies?: string;
  medicalAntecedents?: string;
  currentTreatments?: string;
  guardian?: Pick<BackendPatient, 'id' | 'firstName' | 'lastName' | 'user'>;
}

export interface BackendMedicalAct {
  id: number;
  code: string;
  label: string;
  category?: string;
  sector?: string;
  durationMinutes?: number;
  baseTariff?: number;
  description?: string;
}

export interface BackendRoom {
  id: number;
  roomNumber: string;
  equipmentType?: string;
}

export interface BackendAppointment {
  id: number;
  dateTime: string;
  durationMinutes: number;
  appointmentType?: string;
  description?: string;
  status?: string;
  patient?: BackendPatient;
  doctor?: BackendDoctor;
  room?: BackendRoom;
  invoice?: { id: number };
}

export interface BackendInvoice {
  id: number;
  appointment?: BackendAppointment;
  totalAmount: number;
  issueDate?: string;
  isPaid: boolean;
  paymentMethod?: string;
}

export interface BackendConsultationFile {
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  uploadedAt?: string;
  size?: number;
}

export interface BackendConsultation {
  id: string;
  patientId?: number;
  doctorId?: number;
  templateName?: string;
  consultationReason?: string;
  diagnosis?: string;
  observation?: string;
  followUpPlan?: string;
  vitals?: Record<string, string>;
  prescriptions?: string[];
  prescriptionItems?: BackendPrescriptionItem[];
  files?: BackendConsultationFile[];
  createdAt?: string;
}

export interface BackendPrescriptionItem {
  medicationName: string;
  dosage?: string;
  frequency?: string;
  durationDays?: number;
  instructions?: string;
}

export interface BackendMedicationSuggestion {
  name: string;
  form: string;
  commonDosage: string;
  frequencyHint: string;
}

export interface BackendNotification {
  title: string;
  detail: string;
  tone: string;
  category: string;
  createdAt?: string;
}

export interface BackendClinicProfile {
  id?: number;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  specialtiesOffered?: string;
}

export interface BackendPatientFeedback {
  id: string;
  patientId: number;
  doctorId?: number;
  doctorName?: string;
  appointmentId?: number;
  type: 'REVIEW' | 'COMPLAINT';
  rating?: number;
  title: string;
  message: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdAt?: string;
}

export interface BackendDoctorFeedbackSummary {
  doctorId: number;
  averageRating: number;
  reviewCount: number;
  complaintCount: number;
}
