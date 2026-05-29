import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface BackendUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
}

export type BackendRole = 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';

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
  observation?: string;
  prescriptions?: string[];
  files?: Record<string, unknown>[];
}

@Injectable({ providedIn: 'root' })
export class MedisyncApiService {
  constructor(private readonly http: HttpClient) {}

  updatePatientProfile(patientId: number, body: Partial<BackendPatient>) {
    return this.http.put<BackendPatient>(`/api/patient/${patientId}`, body);
  }


  getDoctors() {
    return this.http.get<BackendDoctor[]>('/api/doctor');
  }

  getAvailableSlots(doctorId: number, date: string, duration = 30) {
    const params = new HttpParams().set('date', date).set('duration', duration);
    return this.http.get<string[]>(`/api/doctor/${doctorId}/available-slots`, { params });
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

  getPatientInvoices(patientId: number) {
    return this.http.get<BackendInvoice[]>(`/api/invoices/patient/${patientId}`);
  }

  markInvoicePaid(id: number) {
    return this.http.patch<BackendInvoice>(`/api/secretary/invoices/${id}/pay`, {});
  }

  getRoomsForAdmin() {
    return this.http.get<BackendRoom[]>('/api/admin/rooms');
  }

  createRoom(body: { roomNumber: string; equipmentType: string }) {
    return this.http.post<BackendRoom>('/api/admin/rooms', body);
  }

  deleteRoom(id: number) {
    return this.http.delete<void>(`/api/admin/rooms/${id}`);
  }

  getAdminUsers() {
    return this.http.get<BackendUser[]>('/api/admin/users');
  }

  createAdminUser(body: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    role: BackendRole;
  }) {
    return this.http.post<BackendUser>('/api/admin/users', body);
  }

  deleteAdminUser(id: number) {
    return this.http.delete<void>(`/api/admin/users/${id}`);
  }

  getConsultationsForPatient(patientId: number) {
    return this.http.get<BackendConsultation[]>(`/api/consultations/patient/${patientId}`);
  }

  getConsultationsForDoctor(doctorId: number) {
    return this.http.get<BackendConsultation[]>(`/api/consultations/doctor/${doctorId}`);
  }

  createConsultation(body: { patientId: number; doctorId: number; observation: string; prescriptions: string[] }) {
    return this.http.post<BackendConsultation>('/api/consultations', body);
  }

  updateConsultation(id: string, body: { observation: string; prescriptions: string[] }) {
    return this.http.put<BackendConsultation>(`/api/consultations/${id}`, body);
  }
}
