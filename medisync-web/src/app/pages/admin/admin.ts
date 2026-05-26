import { Component } from '@angular/core';
import { appointments, doctors, patients } from '../../data/medisync-data';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
})
export class Admin {
  doctors = doctors;
  patients = patients;
  appointments = appointments;
}
