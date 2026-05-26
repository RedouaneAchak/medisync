import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { doctors } from '../../data/medisync-data';

@Component({
  selector: 'app-booking',
  imports: [FormsModule, RouterLink],
  templateUrl: './booking.html',
})
export class Booking {
  doctors = doctors;
  selectedDoctor = doctors[0].name;
  selectedDate = '2026-06-10';
  selectedTime = '09:30';
  motif = 'Suivi';
  forSomeoneElse = false;

  slots = ['09:00', '09:30', '10:30', '11:30', '14:00', '15:30', '16:00'];
}
