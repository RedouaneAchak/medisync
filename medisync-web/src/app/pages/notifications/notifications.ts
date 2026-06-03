import { Component } from '@angular/core';

import { AuthService } from '../../services/auth.service';
import { BackendNotification, MedisyncApiService } from '../../services/medisync-api.service';

type NoticeTone = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

interface NotificationRow {
  title: string;
  detail: string;
  time: string;
  tone: NoticeTone;
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.html',
})
export class Notifications {
  notifications: NotificationRow[] = [];
  error = '';

  constructor(
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    const user = this.authService.currentUser();
    if (!user || user.role !== 'PATIENT') {
      this.notifications = [];
      this.error = 'Les notifications détaillées sont actuellement centrées sur l’espace patient.';
      return;
    }

    this.api.getPatientNotifications(user.userId).subscribe({
      next: (items) => {
        this.error = '';
        this.notifications = items.map((item) => this.toRow(item));
      },
      error: () => {
        this.notifications = [];
        this.error = 'Impossible de charger les notifications du backend.';
      },
    });
  }

  private toRow(notification: BackendNotification): NotificationRow {
    return {
      title: notification.title,
      detail: notification.detail,
      tone: this.toTone(notification.tone),
      time: this.toRelativeTime(notification.createdAt),
    };
  }

  private toTone(value: string): NoticeTone {
    if (value === 'green' || value === 'yellow' || value === 'red') {
      return value;
    }
    return 'blue';
  }

  private toRelativeTime(value?: string): string {
    if (!value) {
      return 'Maintenant';
    }

    const date = new Date(value);
    const deltaMinutes = Math.round((Date.now() - date.getTime()) / 60000);

    if (deltaMinutes <= 1) {
      return 'À l’instant';
    }
    if (deltaMinutes < 60) {
      return `Il y a ${deltaMinutes} min`;
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24) {
      return `Il y a ${deltaHours} h`;
    }

    return date.toLocaleDateString('fr-MA');
  }
}
