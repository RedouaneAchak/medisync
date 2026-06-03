import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BackendAuditLog,
  BackendAdminDashboard,
  BackendAdminTwoFactorStatus,
  BackendAppointment,
  BackendClinicProfile,
  BackendDoctor,
  BackendFinancialReportPoint,
  BackendMedicalAct,
  BackendPermissionCatalog,
  BackendPatientFeedback,
  BackendPatient,
  BackendRole,
  BackendRoom,
  BackendUser,
  MedisyncApiService,
} from '../../services/medisync-api.service';

interface AdminDoctorRow {
  id: number;
  name: string;
  specialty: string;
  languages: string;
  price: number;
  initials: string;
}

interface AdminPatientRow {
  name: string;
  category: string;
  phone: string;
  company: string;
  lastVisit: string;
  blood: string;
}

interface AdminAppointmentRow {
  id: number;
  doctor: string;
  patient: string;
  specialty: string;
  date: string;
  time: string;
  room: string;
  type: string;
  status: string;
}

interface AdminAuditLogRow {
  id: string;
  action: string;
  target: string;
  actor: string;
  timestamp: string;
  ipAddress: string;
}

interface AdminFeedbackRow {
  id: string;
  doctorName: string;
  type: 'REVIEW' | 'COMPLAINT';
  title: string;
  message: string;
  rating?: number;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
}

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
})
export class Admin {
  doctors: AdminDoctorRow[] = [];
  patients: AdminPatientRow[] = [];
  appointments: AdminAppointmentRow[] = [];
  users: BackendUser[] = [];
  rooms: BackendRoom[] = [];
  medicalActs: BackendMedicalAct[] = [];
  auditLogs: AdminAuditLogRow[] = [];
  feedbackRows: AdminFeedbackRow[] = [];
  dashboard: BackendAdminDashboard | null = null;
  financialReport: BackendFinancialReportPoint[] = [];
  financialGranularity: 'DAY' | 'MONTH' | 'YEAR' = 'MONTH';
  twoFactorStatus: BackendAdminTwoFactorStatus | null = null;
  permissionCatalog: BackendPermissionCatalog = {
    availablePermissions: [],
    roleDefaults: {},
  };
  editingUserPermissionsId: number | null = null;
  editingUserPermissions: string[] = [];
  clinicProfile: BackendClinicProfile = {
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    latitude: 33.5731,
    longitude: -7.5898,
    openingHours: '',
    specialtiesOffered: '',
  };
  dashboardRange = {
    from: this.defaultFrom(),
    to: this.defaultTo(),
  };
  error = '';
  message = '';
  twoFactorCode = '';
  roleOptions: BackendRole[] = ['PATIENT', 'DOCTOR', 'SECRETARY', 'ADMIN'];
  newUser = {
    firstname: '',
    lastname: '',
    email: '',
    password: 'ChangeMe123!',
    role: 'PATIENT' as BackendRole,
    extraPermissions: [] as string[],
  };
  newRoom = {
    roomNumber: '',
    equipmentType: '',
  };
  editingMedicalActId: number | null = null;
  medicalActForm: Omit<BackendMedicalAct, 'id'> = {
    code: '',
    label: '',
    category: 'Consultation',
    sector: 'SECTEUR_1',
    durationMinutes: 30,
    baseTariff: 300,
    description: '',
  };

  constructor(private readonly api: MedisyncApiService) {
    this.loadDashboardData();
  }

  get doctorMetrics(): Array<{ name: string; count: number }> {
    return Object.entries(this.dashboard?.appointmentsPerDoctor ?? {}).map(([name, count]) => ({ name, count }));
  }

  get roomMetrics(): Array<{ name: string; count: number }> {
    return Object.entries(this.dashboard?.roomOccupancy ?? {}).map(([name, count]) => ({ name, count }));
  }

  createUser(): void {
    this.message = '';
    this.api.createAdminUser(this.newUser).subscribe({
      next: (user) => {
        this.users = [...this.users, user];
        this.message = `Compte ${user.role} cree pour ${user.email}.`;
        this.newUser = {
          firstname: '',
          lastname: '',
          email: '',
          password: 'ChangeMe123!',
          role: 'PATIENT',
          extraPermissions: [],
        };
        this.loadDashboardData();
      },
      error: () => {
        this.message = 'Creation utilisateur impossible. Verifiez le role, l email, la force du mot de passe et vos droits ADMIN.';
      },
    });
  }

  deleteUser(id: number): void {
    this.message = '';
    this.api.deleteAdminUser(id).subscribe({
      next: () => {
        this.users = this.users.filter((user) => user.id !== id);
        this.message = 'Utilisateur supprime.';
        this.loadDashboardData();
      },
      error: () => {
        this.message = 'Suppression impossible: cet utilisateur peut etre lie a un profil ou a des donnees.';
      },
    });
  }

  startPermissionsEdit(user: BackendUser): void {
    this.editingUserPermissionsId = user.id;
    this.editingUserPermissions = [...(user.extraPermissions ?? [])];
  }

  cancelPermissionsEdit(): void {
    this.editingUserPermissionsId = null;
    this.editingUserPermissions = [];
  }

  saveUserPermissions(user: BackendUser): void {
    this.api.updateAdminUserPermissions(user.id, this.editingUserPermissions).subscribe({
      next: (updated) => {
        this.users = this.users.map((item) => (item.id === updated.id ? updated : item));
        this.message = `Permissions mises à jour pour ${updated.email}.`;
        this.cancelPermissionsEdit();
      },
      error: () => {
        this.message = 'Mise à jour des permissions impossible.';
      },
    });
  }

  createRoom(): void {
    this.message = '';
    this.api.createRoom(this.newRoom).subscribe({
      next: (room) => {
        this.rooms = [...this.rooms, room];
        this.message = `Salle ${room.roomNumber} creee.`;
        this.newRoom = { roomNumber: '', equipmentType: '' };
      },
      error: () => {
        this.message = 'Creation de salle impossible. Verifiez vos droits ADMIN.';
      },
    });
  }

  deleteRoom(id: number): void {
    this.message = '';
    this.api.deleteRoom(id).subscribe({
      next: () => {
        this.rooms = this.rooms.filter((room) => room.id !== id);
        this.message = 'Salle supprimee.';
      },
      error: () => {
        this.message = 'Suppression de salle impossible: elle peut etre liee a un rendez-vous.';
      },
    });
  }

  saveClinicProfile(): void {
    this.message = '';
    this.api.updateClinicProfile(this.clinicProfile).subscribe({
      next: (profile) => {
        this.clinicProfile = profile;
        this.message = 'Informations de la clinique mises à jour.';
      },
      error: () => {
        this.message = 'Mise à jour de la clinique impossible.';
      },
    });
  }

  refreshAdminDashboard(): void {
    this.api.getAdminDashboard(this.dashboardRange.from, this.dashboardRange.to).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.loadFinancialReport();
      },
      error: () => {
        this.error = 'Impossible de charger le dashboard administrateur.';
      },
    });
  }

  loadFinancialReport(): void {
    this.api.getInvoiceReportSummary(this.dashboardRange.from, this.dashboardRange.to, this.financialGranularity).subscribe({
      next: (items) => {
        this.financialReport = items;
      },
    });
  }

  exportDashboardCsv(): void {
    const lines = [
      'metric,value',
      `totalAppointments,${this.dashboard?.totalAppointments ?? 0}`,
      `confirmedAppointments,${this.dashboard?.confirmedAppointments ?? 0}`,
      `cancelledAppointments,${this.dashboard?.cancelledAppointments ?? 0}`,
      `noShowRate,${this.dashboard?.noShowRate ?? 0}`,
      `totalRevenue,${this.dashboard?.totalRevenue ?? 0}`,
      `unpaidInvoices,${this.dashboard?.unpaidInvoices ?? 0}`,
      ...this.doctorMetrics.map((item) => `appointmentsPerDoctor:${item.name},${item.count}`),
      ...this.roomMetrics.map((item) => `roomOccupancy:${item.name},${item.count}`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'medisync-dashboard.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  enableTwoFactor(): void {
    if (!this.twoFactorCode.trim()) {
      this.message = 'Saisissez le code généré par votre application d authentification.';
      return;
    }

    this.api.enableAdminTwoFactor(this.twoFactorCode.trim()).subscribe({
      next: (status) => {
        this.twoFactorStatus = status;
        this.twoFactorCode = '';
        this.message = 'Double authentification activée pour ce compte administrateur.';
      },
      error: (error) => {
        this.message = error.error?.message ?? 'Activation 2FA impossible.';
      },
    });
  }

  updateFeedbackStatus(id: string, status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED'): void {
    this.api.updateAdminFeedbackStatus(id, status).subscribe({
      next: (updated) => {
        this.feedbackRows = this.feedbackRows.map((item) => (item.id === id ? this.toFeedbackRow(updated) : item));
        this.message = 'Statut du feedback mis à jour.';
      },
      error: () => {
        this.message = 'Mise à jour du feedback impossible.';
      },
    });
  }

  saveMedicalAct(): void {
    const request = this.editingMedicalActId
      ? this.api.updateAdminMedicalAct(this.editingMedicalActId, this.medicalActForm)
      : this.api.createAdminMedicalAct(this.medicalActForm);

    request.subscribe({
      next: (act) => {
        this.medicalActs = this.editingMedicalActId
          ? this.medicalActs.map((item) => (item.id === act.id ? act : item))
          : [...this.medicalActs, act];
        this.message = this.editingMedicalActId ? 'Acte médical mis à jour.' : 'Acte médical créé.';
        this.editingMedicalActId = null;
        this.medicalActForm = {
          code: '',
          label: '',
          category: 'Consultation',
          sector: 'SECTEUR_1',
          durationMinutes: 30,
          baseTariff: 300,
          description: '',
        };
      },
      error: () => {
        this.message = 'Enregistrement de l acte médical impossible.';
      },
    });
  }

  editMedicalAct(act: BackendMedicalAct): void {
    this.editingMedicalActId = act.id;
    this.medicalActForm = {
      code: act.code,
      label: act.label,
      category: act.category ?? 'Consultation',
      sector: act.sector ?? 'SECTEUR_1',
      durationMinutes: act.durationMinutes ?? 30,
      baseTariff: act.baseTariff ?? 300,
      description: act.description ?? '',
    };
  }

  deleteMedicalAct(id: number): void {
    this.api.deleteAdminMedicalAct(id).subscribe({
      next: () => {
        this.medicalActs = this.medicalActs.filter((item) => item.id !== id);
        this.message = 'Acte médical supprimé.';
      },
      error: () => {
        this.message = 'Suppression de l acte médical impossible.';
      },
    });
  }

  private loadDashboardData(): void {
    this.api.getDoctors().subscribe({
      next: (items) => {
        this.doctors = items.map((doctor) => this.toDoctorCard(doctor));
      },
      error: () => {
        this.error = 'Connectez-vous avec un compte ADMIN pour charger le tableau de bord backend.';
      },
    });

    this.api.getPatients().subscribe({
      next: (items) => {
        this.patients = items.map((patient) => this.toPatientRow(patient));
      },
    });

    this.api.getAppointments().subscribe({
      next: (items) => {
        this.appointments = items.map((appointment) => this.toAppointmentRow(appointment));
      },
    });

    this.api.getAdminUsers().subscribe({
      next: (items) => {
        this.users = items;
      },
    });

    this.api.getAdminPermissionCatalog().subscribe({
      next: (catalog) => {
        this.permissionCatalog = catalog;
      },
    });

    this.api.getRoomsForAdmin().subscribe({
      next: (items) => {
        this.rooms = items;
      },
    });

    this.api.getAdminMedicalActs().subscribe({
      next: (items) => {
        this.medicalActs = items;
      },
    });

    this.api.getClinicProfile().subscribe({
      next: (profile) => {
        this.clinicProfile = profile;
      },
    });

    this.api.getAuditLogs().subscribe({
      next: (items) => {
        this.auditLogs = items.map((log) => this.toAuditRow(log));
      },
    });

    this.api.getAdminTwoFactorStatus().subscribe({
      next: (status) => {
        this.twoFactorStatus = status;
      },
    });

    this.api.getAdminFeedback().subscribe({
      next: (items) => {
        this.feedbackRows = items.map((item) => this.toFeedbackRow(item));
      },
    });

    this.refreshAdminDashboard();
  }

  private toDoctorCard(doctor: BackendDoctor): AdminDoctorRow {
    const firstname = doctor.user?.firstname ?? 'Medecin';
    const lastname = doctor.user?.lastname ?? `#${doctor.id}`;
    return {
      id: doctor.id,
      name: `Dr. ${firstname} ${lastname}`,
      specialty: doctor.specialty ?? 'Medecine generale',
      languages: doctor.spokenLanguages ?? 'Francais, Arabe',
      price: doctor.standardConsultationRate ?? 300,
      initials: `${firstname[0] ?? 'M'}${lastname[0] ?? 'D'}`.toUpperCase(),
    };
  }

  private toPatientRow(patient: BackendPatient): AdminPatientRow {
    return {
      name: `${patient.firstName ?? patient.user?.firstname ?? ''} ${patient.lastName ?? patient.user?.lastname ?? ''}`.trim(),
      category: patient.category ?? 'ADULT',
      phone: patient.phoneNumber ?? '-',
      company: patient.companyName ?? 'Individuel',
      lastVisit: '-',
      blood: '-',
    };
  }

  private toAppointmentRow(appointment: BackendAppointment): AdminAppointmentRow {
    const date = new Date(appointment.dateTime);
    return {
      id: appointment.id,
      doctor: `Dr. ${appointment.doctor?.user?.firstname ?? ''} ${appointment.doctor?.user?.lastname ?? ''}`.trim(),
      patient: `${appointment.patient?.firstName ?? appointment.patient?.user?.firstname ?? ''} ${appointment.patient?.lastName ?? appointment.patient?.user?.lastname ?? ''}`.trim(),
      specialty: appointment.doctor?.specialty ?? 'Consultation',
      date: date.toLocaleDateString('fr-MA'),
      time: date.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }),
      room: appointment.room?.roomNumber ?? '-',
      type: appointment.appointmentType ?? 'Consultation',
      status: appointment.status ?? 'PENDING',
    };
  }

  private toAuditRow(log: BackendAuditLog): AdminAuditLogRow {
    const timestamp = log.timestamp ? new Date(log.timestamp) : null;
    return {
      id: log.id,
      action: log.action ?? 'ACTION',
      target: log.targetEntity ?? 'N/A',
      actor: log.userId != null ? `Utilisateur #${log.userId}` : 'Systeme',
      timestamp: timestamp
        ? `${timestamp.toLocaleDateString('fr-MA')} ${timestamp.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}`
        : 'Horodatage indisponible',
      ipAddress: log.ipAddress ?? '-',
    };
  }

  private toFeedbackRow(item: BackendPatientFeedback): AdminFeedbackRow {
    return {
      id: item.id,
      doctorName: item.doctorName ?? 'Clinique MediSync',
      type: item.type,
      title: item.title,
      message: item.message,
      rating: item.rating,
      status: item.status,
      createdAt: item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('fr-MA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : 'Date indisponible',
    };
  }

  private defaultFrom(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 16);
  }

  private defaultTo(): string {
    return new Date().toISOString().slice(0, 16);
  }

  togglePermission(target: string[], permission: string, checked: boolean): void {
    if (checked) {
      if (!target.includes(permission)) {
        target.push(permission);
      }
      return;
    }
    const index = target.indexOf(permission);
    if (index >= 0) {
      target.splice(index, 1);
    }
  }

  hasPermission(target: string[], permission: string): boolean {
    return target.includes(permission);
  }

  roleDefaults(role: string): string[] {
    return this.permissionCatalog.roleDefaults[role] ?? [];
  }
}
