import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { doctors } from '../../data/medisync-data';

@Component({
  selector: 'app-doctors',
  imports: [FormsModule, RouterLink],
  templateUrl: './doctors.html',
})
export class Doctors {
  doctors = doctors;
  query = '';
  specialty = 'Tous';

  specialties = ['Tous', ...new Set(doctors.map((doctor) => doctor.specialty))];

  get filteredDoctors() {
    const query = this.query.toLowerCase().trim();
    return this.doctors.filter((doctor) => {
      const matchesSpecialty = this.specialty === 'Tous' || doctor.specialty === this.specialty;
      const matchesQuery = [doctor.name, doctor.specialty, doctor.city, doctor.clinic]
        .join(' ')
        .toLowerCase()
        .includes(query);
      return matchesSpecialty && matchesQuery;
    });
  }
}
