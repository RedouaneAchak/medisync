export interface AuthUser {
  userId: number;
  firstname: string;
  lastname: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';
}

export interface AuthResponse extends AuthUser {
  token: string;
}

export interface BackendUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
}

export interface BackendDoctor {
  id: number;
  user?: BackendUser;
  specialty?: string;
  bio?: string;
  spokenLanguages?: string;
  standardConsultationRate?: number;
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
  guardian?: Pick<BackendPatient, 'id' | 'firstName' | 'lastName' | 'user'>;
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
  observation?: string;
  prescriptions?: string[];
  files?: BackendConsultationFile[];
  createdAt?: string;
}
