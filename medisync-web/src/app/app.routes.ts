import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Accueil - MediSync',
  },
  {
    path: 'announcements',
    loadComponent: () => import('./pages/announcements/announcements').then((m) => m.Announcements),
    title: 'Annonces - MediSync',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Connexion - MediSync',
  },
  {
    path: 'doctors',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/doctors/doctors').then((m) => m.Doctors),
    title: 'Medecins - MediSync',
  },
  {
    path: 'booking',
    canActivate: [authGuard],
    data: { roles: ['PATIENT', 'SECRETARY', 'ADMIN'] },
    loadComponent: () => import('./pages/booking/booking').then((m) => m.Booking),
    title: 'Reservation - MediSync',
  },
  {
    path: 'appointments',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/appointments/appointments').then((m) => m.Appointments),
    title: 'Rendez-vous - MediSync',
  },
  {
    path: 'medical-record',
    canActivate: [authGuard],
    data: { roles: ['PATIENT', 'DOCTOR', 'ADMIN'] },
    loadComponent: () => import('./pages/medical-record/medical-record').then((m) => m.MedicalRecord),
    title: 'Dossier medical - MediSync',
  },
  {
    path: 'patients',
    canActivate: [authGuard],
    data: { roles: ['SECRETARY', 'ADMIN'] },
    loadComponent: () => import('./pages/patients/patients').then((m) => m.Patients),
    title: 'Patients - MediSync',
  },
  {
    path: 'billing',
    canActivate: [authGuard],
    data: { roles: ['PATIENT', 'SECRETARY', 'ADMIN'] },
    loadComponent: () => import('./pages/billing/billing').then((m) => m.Billing),
    title: 'Facturation - MediSync',
  },
  {
    path: 'rooms',
    canActivate: [authGuard],
    data: { roles: ['SECRETARY', 'ADMIN'] },
    loadComponent: () => import('./pages/rooms/rooms').then((m) => m.Rooms),
    title: 'Salles - MediSync',
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/notifications/notifications').then((m) => m.Notifications),
    title: 'Notifications - MediSync',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
    title: 'Profil - MediSync',
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
    title: 'Administration - MediSync',
  },
  
  // --- NEW ROUTES ADDED HERE ---
  {
    path: 'consultations',
    canActivate: [authGuard],
    data: { roles: ['DOCTOR', 'ADMIN'] },
    loadComponent: () => import('./pages/consultations/consultations').then((m) => m.Consultations),
    title: 'Consultations - MediSync',
  },
  {
    path: 'audit-logs',
    canActivate: [authGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./pages/audit-logs/audit-logs').then((m) => m.AuditLogs),
    title: 'Logs d\'audit - MediSync',
  },
  
  { path: '**', redirectTo: '' },
];