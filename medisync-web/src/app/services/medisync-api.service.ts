import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface BackendUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  extraPermissions?: string[];
  effectivePermissions?: string[];
}

export type BackendRole = 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';

export interface BackendPermissionCatalog {
  availablePermissions: string[];
  roleDefaults: Record<string, string[]>;
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
  files?: Record<string, unknown>[];
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

export interface BackendCareSheet {
  id: number;
  appointment?: BackendAppointment;
  medicalAct?: BackendMedicalAct;
  amount: number;
  status?: string;
  notes?: string;
  createdAt?: string;
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

export interface BackendAdminDashboard {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  noShowRate: number;
  totalRevenue: number;
  unpaidInvoices: number;
  appointmentsPerDoctor: Record<string, number>;
  roomOccupancy: Record<string, number>;
}

export interface BackendFinancialReportPoint {
  label: string;
  revenue: number;
  invoiceCount: number;
  paidInvoiceCount: number;
}

export interface BackendAdminTwoFactorStatus {
  enabled: boolean;
  setupRequired: boolean;
  secret?: string | null;
  provisioningUri?: string | null;
  enabledAt?: string | null;
}

export interface BackendAuditLog {
  id: string;
  userId?: number;
  action: string;
  targetEntity?: string;
  timestamp?: string;
  ipAddress?: string;
}

export interface BackendDoctorUnavailability {
  id: number;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  type: string;
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


@Injectable({ providedIn: 'root' })
export class MedisyncApiService {
  constructor(private readonly http: HttpClient) { }

  updatePatientProfile(patientId: number, body: Partial<BackendPatient>) {
    return this.http.put<BackendPatient>(`/api/patient/${patientId}`, body);
  }

  getPatientProfile(patientId: number) {
    return this.http.get<BackendPatient>(`/api/patient/${patientId}`);
  }

  getDependents(patientId: number) {
    return this.http.get<BackendPatient[]>(`/api/patient/${patientId}/dependents`);
  }

  getPatientNotifications(patientId: number) {
    return this.http.get<BackendNotification[]>(`/api/patient/${patientId}/notifications`);
  }

  getDoctorProfile(doctorId: number) {
    return this.http.get<BackendDoctor>(`/api/doctor/${doctorId}`);
  }

  updateDoctorProfile(doctorId: number, body: Partial<BackendDoctor>) {
    return this.http.put<BackendDoctor>(`/api/doctor/${doctorId}`, body);
  }

  getDoctors() {
    return this.http.get<BackendDoctor[]>('/api/doctor');
  }

  searchDoctors(specialty?: string, query?: string) {
    let params = new HttpParams();
    if (specialty && specialty !== 'Tous') {
      params = params.set('specialty', specialty);
    }
    if (query?.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<BackendDoctor[]>('/api/doctor/search', { params });
  }




  getAvailableSlots(doctorId: number, date: string, duration = 30) {
    const params = new HttpParams().set('date', date).set('duration', duration);
    return this.http.get<string[]>(`/api/doctor/${doctorId}/available-slots`, { params });
  }

  getMedicalActs(q?: string) {
    let params = new HttpParams();
    if (q?.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<BackendMedicalAct[]>('/api/medical-acts', { params });
  }

  getRooms() {
    return this.http.get<BackendRoom[]>('/api/rooms');
  }

  getAppointments() {
    return this.http.get<BackendAppointment[]>('/api/appointments');
  }

  getPatientAppointments(patientId: number) {
    return this.http.get<BackendAppointment[]>(`/api/appointments/patient/${patientId}`);
  }

  getDoctorAppointments(doctorId: number, from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<BackendAppointment[]>(`/api/doctor/${doctorId}/appointments`, { params });
  }

  createAppointment(body: {
    patientId: number;
    doctorId: number;
    roomId: number;
    dateTime: string;
    durationMinutes: number;
    appointmentType: string;
    description: string;
  }) {
    return this.http.post<BackendAppointment>('/api/appointments', body);
  }

  cancelAppointment(id: number) {
    return this.http.patch<BackendAppointment>(`/api/appointments/${id}/cancel`, {});
  }

  confirmAppointment(id: number) {
    return this.http.patch<BackendAppointment>(`/api/appointments/${id}/confirm`, {});
  }

  updateAppointment(id: number, body: { dateTime: string; durationMinutes: number; roomId: number }) {
    return this.http.put<BackendAppointment>(`/api/appointments/${id}`, body);
  }

  getPatients() {
    return this.http.get<BackendPatient[]>('/api/secretary/patients');
  }

  createPatient(body: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    ssn: string;
    category: string;
    companyName: string;
  }) {
    return this.http.post<BackendPatient>('/api/secretary/patients', body);
  }

  getInvoices() {
    return this.http.get<BackendInvoice[]>('/api/invoices');
  }

  getCareSheets() {
    return this.http.get<BackendCareSheet[]>('/api/secretary/care-sheets');
  }

  createCareSheet(body: { appointmentId: number; medicalActId: number; amount?: number; notes?: string }) {
    return this.http.post<BackendCareSheet>('/api/secretary/care-sheets', body);
  }

  getPatientInvoices(patientId: number) {
    return this.http.get<BackendInvoice[]>(`/api/invoices/patient/${patientId}`);
  }

  markInvoicePaid(id: number) {
    return this.http.patch<BackendInvoice>(`/api/secretary/invoices/${id}/pay`, {});
  }

  generateInvoice(body: { appointmentId: number; amount: number; paymentMethod: string }) {
    return this.http.post<BackendInvoice>('/api/secretary/invoices', body);
  }

  generateInvoiceFromCareSheet(careSheetId: number, paymentMethod: string) {
    return this.http.post<BackendInvoice>(`/api/secretary/care-sheets/${careSheetId}/invoice`, { paymentMethod });
  }

  sendInvoiceEmail(id: number) {
    return this.http.post<BackendInvoice>(`/api/invoices/${id}/send-email`, {});
  }

  getRoomsForAdmin() {
    return this.http.get<BackendRoom[]>('/api/admin/rooms');
  }

  getAdminDashboard(from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<BackendAdminDashboard>('/api/admin/dashboard', { params });
  }

  getInvoiceReportSummary(from: string, to: string, granularity: 'DAY' | 'MONTH' | 'YEAR') {
    const params = new HttpParams().set('from', from).set('to', to).set('granularity', granularity);
    return this.http.get<BackendFinancialReportPoint[]>('/api/invoices/report/summary', { params });
  }

  getAuditLogs() {
    return this.http.get<BackendAuditLog[]>('/api/admin/audit-logs');
  }

  getAdminTwoFactorStatus() {
    return this.http.get<BackendAdminTwoFactorStatus>('/api/admin/two-factor');
  }

  enableAdminTwoFactor(otpCode: string) {
    return this.http.post<BackendAdminTwoFactorStatus>('/api/admin/two-factor/enable', { otpCode });
  }

  getClinicProfile() {
    return this.http.get<BackendClinicProfile>('/api/clinic-profile');
  }

  updateClinicProfile(body: BackendClinicProfile) {
    return this.http.put<BackendClinicProfile>('/api/admin/clinic-profile', body);
  }

  createRoom(body: { roomNumber: string; equipmentType: string }) {
    return this.http.post<BackendRoom>('/api/admin/rooms', body);
  }

  deleteRoom(id: number) {
    return this.http.delete<void>(`/api/admin/rooms/${id}`);
  }

  getAdminMedicalActs(q?: string) {
    let params = new HttpParams();
    if (q?.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<BackendMedicalAct[]>('/api/admin/medical-acts', { params });
  }

  createAdminMedicalAct(body: Omit<BackendMedicalAct, 'id'>) {
    return this.http.post<BackendMedicalAct>('/api/admin/medical-acts', body);
  }

  updateAdminMedicalAct(id: number, body: Omit<BackendMedicalAct, 'id'>) {
    return this.http.put<BackendMedicalAct>(`/api/admin/medical-acts/${id}`, body);
  }

  deleteAdminMedicalAct(id: number) {
    return this.http.delete<void>(`/api/admin/medical-acts/${id}`);
  }

  getAdminUsers() {
    return this.http.get<BackendUser[]>('/api/admin/users');
  }

  getAdminPermissionCatalog() {
    return this.http.get<BackendPermissionCatalog>('/api/admin/permissions/catalog');
  }

  createAdminUser(body: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    role: BackendRole;
    extraPermissions?: string[];
  }) {
    return this.http.post<BackendUser>('/api/admin/users', body);
  }

  updateAdminUserPermissions(id: number, extraPermissions: string[]) {
    return this.http.put<BackendUser>(`/api/admin/users/${id}/permissions`, { extraPermissions });
  }

  deleteAdminUser(id: number) {
    return this.http.delete<void>(`/api/admin/users/${id}`);
  }

  getConsultationsForPatient(patientId: number) {
    return this.http.get<BackendConsultation[]>(`/api/consultations/patient/${patientId}`);
  }

  getPatientMedicalHistory(patientId: number) {
    return this.http.get<BackendConsultation[]>(`/api/patient/${patientId}/medical-history`);
  }

  getConsultationsForDoctor(doctorId: number) {
    return this.http.get<BackendConsultation[]>(`/api/consultations/doctor/${doctorId}`);
  }

  getDoctorUnavailabilities(doctorId: number) {
    return this.http.get<BackendDoctorUnavailability[]>(`/api/doctor/${doctorId}/unavailabilities`);
  }

  createDoctorUnavailability(
    doctorId: number,
    body: { startDateTime: string; endDateTime: string; reason: string; type: string },
  ) {
    return this.http.post<BackendDoctorUnavailability>(`/api/doctor/${doctorId}/unavailabilities`, body);
  }

  deleteDoctorUnavailability(doctorId: number, unavailabilityId: number) {
    return this.http.delete<void>(`/api/doctor/${doctorId}/unavailabilities/${unavailabilityId}`);
  }

  getDoctorFeedbackSummaries() {
    return this.http.get<BackendDoctorFeedbackSummary[]>('/api/feedback/doctor-summaries');
  }

  getPatientFeedback(patientId: number) {
    return this.http.get<BackendPatientFeedback[]>(`/api/feedback/patient/${patientId}`);
  }

  createPatientFeedback(
    patientId: number,
    body: {
      doctorId?: number;
      appointmentId?: number;
      type: 'REVIEW' | 'COMPLAINT';
      rating?: number;
      title: string;
      message: string;
    },
  ) {
    return this.http.post<BackendPatientFeedback>(`/api/feedback/patient/${patientId}`, body);
  }

  getAdminFeedback() {
    return this.http.get<BackendPatientFeedback[]>('/api/feedback/admin');
  }

  updateAdminFeedbackStatus(id: string, status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED') {
    return this.http.patch<BackendPatientFeedback>(`/api/feedback/admin/${id}/status`, { status });
  }

  updateConsultation(
    id: string,
    body: {
      templateName?: string;
      consultationReason?: string;
      diagnosis?: string;
      observation?: string;
      followUpPlan?: string;
      vitals?: Record<string, string>;
      prescriptions?: string[];
      prescriptionItems?: BackendPrescriptionItem[];
    },
  ) {
    return this.http.put<BackendConsultation>(`/api/consultations/${id}`, body);
  }

  searchMedications(q?: string) {
    let params = new HttpParams();
    if (q?.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<BackendMedicationSuggestion[]>('/api/consultations/medications/search', { params });
  }

  createConsultation(body: {
    patientId: number;
    doctorId: number;
    templateName?: string;
    consultationReason?: string;
    diagnosis?: string;
    observation: string;
    followUpPlan?: string;
    vitals?: Record<string, string>;
    prescriptions?: string[];
    prescriptionItems?: BackendPrescriptionItem[];
  }) {
    return this.http.post<BackendConsultation>('/api/consultations', body);
  }

  addConsultationFile(id: string, body: Record<string, unknown>) {
    return this.http.post<BackendConsultation>(`/api/consultations/${id}/files`, body);
  }
  // --- ADD THESE TO medisync-api.service.ts ---

  uploadConsultationFile(consultationId: string, formData: FormData) {
    // Angular's HttpClient automatically sets the correct 'multipart/form-data' boundary
    return this.http.post<BackendConsultation>(`/api/consultations/${consultationId}/upload`, formData);
  }

  uploadPatientDocument(patientId: number, formData: FormData) {
    return this.http.post<any>(`/api/patient/${patientId}/upload`, formData);
  }

  addPatientDocument(patientId: number, body: Record<string, unknown>, doctorId = 0) {
    const params = new HttpParams().set('doctorId', doctorId);
    return this.http.post<BackendConsultation>(`/api/patient/${patientId}/documents`, body, { params });
  }
}
