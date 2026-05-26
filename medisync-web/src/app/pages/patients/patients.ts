import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { patients } from '../../data/medisync-data';

@Component({
  selector: 'app-patients',
  imports: [FormsModule],
  templateUrl: './patients.html',
})
export class Patients {
  patients = patients;
  query = '';

  get filteredPatients() {
    return this.patients.filter((patient) =>
      [patient.name, patient.category, patient.company].join(' ').toLowerCase().includes(this.query.toLowerCase()),
    );
  }
}
