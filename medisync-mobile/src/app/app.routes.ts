import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage)
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.page').then(m => m.SearchPage)
  },
  {
    path: 'booking',
    loadComponent: () => import('./pages/booking/booking.page').then(m => m.BookingPage)
  },
  {
    path: 'appointments',
    loadComponent: () => import('./pages/appointments/appointments.page').then(m => m.AppointmentsPage)
  },
  {
    path: 'dossier',
    loadComponent: () => import('./pages/dossier/dossier.page').then(m => m.DossierPage)
  },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications.page').then(m => m.NotificationsPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage)
  }
];
