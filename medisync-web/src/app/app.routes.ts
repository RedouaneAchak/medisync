import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'MediSync - Dashboard',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Connexion - MediSync',
  },
  {
    path: 'doctors',
    loadComponent: () => import('./pages/doctors/doctors').then((m) => m.Doctors),
    title: 'Medecins - MediSync',
  },
  {
    path: 'booking',
    loadComponent: () => import('./pages/booking/booking').then((m) => m.Booking),
    title: 'Reservation - MediSync',
  },
  {
    path: 'appointments',
    loadComponent: () => import('./pages/appointments/appointments').then((m) => m.Appointments),
    title: 'Rendez-vous - MediSync',
  },
  {
    path: 'medical-record',
    loadComponent: () => import('./pages/medical-record/medical-record').then((m) => m.MedicalRecord),
    title: 'Dossier medical - MediSync',
  },
  {
    path: 'patients',
    loadComponent: () => import('./pages/patients/patients').then((m) => m.Patients),
    title: 'Patients - MediSync',
  },
  {
    path: 'billing',
    loadComponent: () => import('./pages/billing/billing').then((m) => m.Billing),
    title: 'Facturation - MediSync',
  },
  {
    path: 'rooms',
    loadComponent: () => import('./pages/rooms/rooms').then((m) => m.Rooms),
    title: 'Salles - MediSync',
  },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications').then((m) => m.Notifications),
    title: 'Notifications - MediSync',
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
    title: 'Profil - MediSync',
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
    title: 'Administration - MediSync',
  },
  { path: '**', redirectTo: '' },
];
