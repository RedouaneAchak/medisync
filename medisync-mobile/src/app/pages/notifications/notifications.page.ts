import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendNotification } from '../../services/medisync.models';

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
    this.api.getPatientNotifications(user.userId).subscribe({
      next: (items: BackendNotification[]) => {
        const mapped = items.map((item) => this.toNotificationItem(item));
        if (!mapped.length) {
          mapped.push({
            icon: '✅',
            iconBg: '#dcfce7',
            title: 'Aucune alerte urgente',
            body: 'Vos rendez-vous et votre facturation sont à jour.',
            time: 'Maintenant',
            read: true,
          });
        }

        this.todayNotifs = mapped.slice(0, 2);
        this.weekNotifs = mapped.slice(2);
      },
      error: () => {
        this.error = 'Impossible de charger les notifications.';
      },
    });
  }

  private toNotificationItem(item: BackendNotification): NotificationItem {
    const palette: Record<string, { icon: string; bg: string }> = {
      green: { icon: '✅', bg: '#dcfce7' },
      yellow: { icon: '💳', bg: '#fef3c7' },
      red: { icon: '⚠️', bg: '#fee2e2' },
      blue: { icon: '📅', bg: '#dbeafe' },
    };
    const visual = palette[item.tone] ?? palette['blue'];

    return {
      icon: visual.icon,
      iconBg: visual.bg,
      title: item.title,
      body: item.detail,
      time: this.toRelativeTime(item.createdAt),
      read: false,
    };
  }

  private toRelativeTime(value?: string): string {
    if (!value) {
      return 'Maintenant';
    }

    const date = new Date(value);
    const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);

    if (diffMinutes <= 1) {
      return 'À l’instant';
    }
    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `Il y a ${diffHours} h`;
    }

    return date.toLocaleDateString('fr-MA');
  }
}
