import { Component } from '@angular/core';
import { notifications } from '../../data/medisync-data';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.html',
})
export class Notifications {
  notifications = notifications;
}
