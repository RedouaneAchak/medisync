import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../environments/environment';
import {
  BackendAppointment,
  BackendClinicProfile,
  BackendConsultation,
  BackendDoctor,
  BackendDoctorFeedbackSummary,
  BackendInvoice,
  BackendMedicalAct,
  BackendMedicationSuggestion,
  BackendNotification,
  BackendPatient,
  BackendPatientFeedback,
  BackendPrescriptionItem,
  BackendRoom,
} from './medisync.models';

@Injectable({ providedIn: 'root' })
export class MedisyncApiService {
  constructor(private readonly http: HttpClient) {}

  getDoctors() {
    return this.http.get<BackendDoctor[]>(this.endpoint('/doctor'));
  }

  searchDoctors(specialty?: string, query?: string) {
    let params = new HttpParams();
    if (specialty && specialty !== 'Tous') {
      params = params.set('specialty', specialty);
    }
    if (query?.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<BackendDoctor[]>(this.endpoint('/doctor/search'), { params });
  }

  getAvailableSlots(doctorId: number, date: string, duration = 30) {
    const params = new HttpParams().set('date', date).set('duration', duration);
    return this.http.get<string[]>(this.endpoint(`/doctor/${doctorId}/available-slots`), { params });
  }

  getMedicalActs(q?: string) {
    let params = new HttpParams();
    if (q?.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<BackendMedicalAct[]>(this.endpoint('/medical-acts'), { params });
  }

  getRooms() {
    return this.http.get<BackendRoom[]>(this.endpoint('/rooms'));
  }

  getPatientAppointments(patientId: number) {
    return this.http.get<BackendAppointment[]>(this.endpoint(`/appointments/patient/${patientId}`));
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
    return this.http.post<BackendAppointment>(this.endpoint('/appointments'), body);
  }

  cancelAppointment(id: number) {
    return this.http.patch<BackendAppointment>(this.endpoint(`/appointments/${id}/cancel`), {});
  }

  getPatientProfile(patientId: number) {
    return this.http.get<BackendPatient>(this.endpoint(`/patient/${patientId}`));
  }

  getDependents(patientId: number) {
    return this.http.get<BackendPatient[]>(this.endpoint(`/patient/${patientId}/dependents`));
  }

  getPatientNotifications(patientId: number) {
    return this.http.get<BackendNotification[]>(this.endpoint(`/patient/${patientId}/notifications`));
  }

  getPatientMedicalHistory(patientId: number) {
    return this.http.get<BackendConsultation[]>(this.endpoint(`/patient/${patientId}/medical-history`));
  }

  searchMedications(q?: string) {
    let params = new HttpParams();
    if (q?.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<BackendMedicationSuggestion[]>(this.endpoint('/consultations/medications/search'), { params });
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
    return this.http.post<BackendConsultation>(this.endpoint('/consultations'), body);
  }

  uploadPatientDocument(patientId: number, formData: FormData) {
    return this.http.post<BackendConsultation>(this.endpoint(`/patient/${patientId}/upload`), formData);
  }

  getPatientInvoices(patientId: number) {
    return this.http.get<BackendInvoice[]>(this.endpoint(`/invoices/patient/${patientId}`));
  }

  getClinicProfile() {
    return this.http.get<BackendClinicProfile>(this.endpoint('/clinic-profile'));
  }

  getDoctorFeedbackSummaries() {
    return this.http.get<BackendDoctorFeedbackSummary[]>(this.endpoint('/feedback/doctor-summaries'));
  }

  getPatientFeedback(patientId: number) {
    return this.http.get<BackendPatientFeedback[]>(this.endpoint(`/feedback/patient/${patientId}`));
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
    return this.http.post<BackendPatientFeedback>(this.endpoint(`/feedback/patient/${patientId}`), body);
  }

  private endpoint(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
