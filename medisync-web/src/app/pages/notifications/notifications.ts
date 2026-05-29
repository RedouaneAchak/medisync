import { Component } from '@angular/core';

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
}
