import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendAppointment, BackendInvoice } from '../../services/medisync.models';

interface NotificationItem {
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent],
})
export class NotificationsPage {
  todayNotifs: NotificationItem[] = [];
  weekNotifs: NotificationItem[] = [];
  error = '';

  constructor(
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {}

  ionViewWillEnter(): void {
    this.loadNotifications();
  }

  markRead(notif: NotificationItem): void {
    notif.read = true;
  }

  private loadNotifications(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.authService.logout();
      return;
    }

    this.error = '';
    forkJoin({
      appointments: this.api.getPatientAppointments(user.userId),
      invoices: this.api.getPatientInvoices(user.userId),
    }).subscribe({
      next: ({ appointments, invoices }: { appointments: BackendAppointment[]; invoices: BackendInvoice[] }) => {
        const now = Date.now();
        const generated: NotificationItem[] = [];

        appointments
          .filter((appointment) => appointment.status !== 'CANCELLED')
          .forEach((appointment) => {
            const date = new Date(appointment.dateTime);
            const diffHours = Math.round((date.getTime() - now) / 3600000);
            if (diffHours >= 0 && diffHours <= 24) {
              generated.push({
                icon: '📅',
                iconBg: '#dbeafe',
                title: 'Rappel de rendez-vous',
                body: `Votre RDV ${appointment.appointmentType ?? 'consultation'} est prévu le ${date.toLocaleDateString('fr-MA')} à ${date.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}.`,
                time: diffHours <= 1 ? 'Dans moins d’une heure' : `Dans ${diffHours} heure(s)`,
                read: false,
              });
            }
          });

        invoices
          .filter((invoice) => !invoice.isPaid)
          .forEach((invoice) => {
            generated.push({
              icon: '💳',
              iconBg: '#fef3c7',
              title: 'Facture en attente',
              body: `La facture FAC-${invoice.id} de ${invoice.totalAmount} MAD est encore à régler.`,
              time: 'Cette semaine',
              read: false,
            });
          });

        if (!generated.length) {
          generated.push({
            icon: '✅',
            iconBg: '#dcfce7',
            title: 'Aucune alerte urgente',
            body: 'Vos rendez-vous et votre facturation sont à jour.',
            time: 'Maintenant',
            read: true,
          });
        }

        this.todayNotifs = generated.slice(0, 2);
        this.weekNotifs = generated.slice(2);
      },
      error: () => {
        this.error = 'Impossible de charger les notifications.';
      },
    });
  }
}
