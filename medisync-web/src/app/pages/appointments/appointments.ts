import { Component } from '@angular/core';
import { appointments } from '../../data/medisync-data';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.html',
})
export class Appointments {
  appointments = appointments;
  activeTab = 'A venir';
  tabs = ['A venir', 'A confirmer', 'Historique'];
}
