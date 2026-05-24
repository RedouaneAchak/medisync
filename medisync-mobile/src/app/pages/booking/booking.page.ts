import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent]
})
export class BookingPage implements OnInit {

  doctor: any = {
    name: 'Dr. Sara Benali',
    specialty: 'Cardiologue',
    rating: 4.8,
    location: 'Casablanca',
    initials: 'SB',
    avatarBg: '#dbeafe',
    avatarColor: '#1565C0'
  };

  motifs = ['Consultation générale', 'Suivi', 'Urgence', 'Première visite'];
  selectedMotif: string = '';
  selectedDate: string = '';
  selectedSlot: string = '';

  availableDates = this.generateDates();
  timeSlots = [
    { time: '09:00', available: true },
    { time: '09:30', available: true },
    { time: '10:00', available: false },
    { time: '10:30', available: true },
    { time: '11:00', available: false },
    { time: '11:30', available: true },
    { time: '14:00', available: true },
    { time: '14:30', available: true },
    { time: '15:00', available: false },
    { time: '15:30', available: true },
    { time: '16:00', available: true },
    { time: '16:30', available: false },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Récupérer le médecin depuis la navigation
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as any;
    if (state?.doctor) {
      this.doctor = state.doctor;
    }
  }

  generateDates() {
    const dates = [];
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        day: days[d.getDay()],
        num: d.getDate().toString(),
        full: d.toISOString().split('T')[0]
      });
    }
    return dates;
  }

  selectDate(date: string) {
    this.selectedDate = date;
    this.selectedSlot = '';
  }

  selectSlot(slot: any) {
    if (slot.available) {
      this.selectedSlot = slot.time;
    }
  }

  canConfirm(): boolean {
    return !!this.selectedMotif && !!this.selectedDate && !!this.selectedSlot;
  }

  confirmBooking() {
    if (this.canConfirm()) {
      alert(`RDV confirmé avec ${this.doctor.name}\n📅 ${this.selectedDate} à ${this.selectedSlot}\nMotif : ${this.selectedMotif}`);
      this.router.navigate(['/appointments']);
    }
  }

  goBack() {
    this.router.navigate(['/search']);
  }
}
