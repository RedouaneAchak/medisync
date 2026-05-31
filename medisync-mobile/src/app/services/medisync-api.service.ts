import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../../environments/environment';
import {
  BackendAppointment,
  BackendConsultation,
  BackendDoctor,
  BackendInvoice,
  BackendPatient,
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

  getPatientMedicalHistory(patientId: number) {
    return this.http.get<BackendConsultation[]>(this.endpoint(`/patient/${patientId}/medical-history`));
  }

  uploadPatientDocument(patientId: number, formData: FormData) {
    return this.http.post<BackendConsultation>(this.endpoint(`/patient/${patientId}/upload`), formData);
  }

  getPatientInvoices(patientId: number) {
    return this.http.get<BackendInvoice[]>(this.endpoint(`/invoices/patient/${patientId}`));
  }

  private endpoint(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
