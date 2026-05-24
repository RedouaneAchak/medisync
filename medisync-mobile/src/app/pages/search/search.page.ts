import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, TabBarComponent]
})
export class SearchPage {

  searchQuery: string = '';
  activeFilter: string = 'Tous';

  allDoctors = [
    { name: 'Dr. Sara Benali', specialty: 'Cardiologue', rating: 4.8, location: 'Casablanca', available: true, initials: 'SB', avatarBg: '#dbeafe', avatarColor: '#1565C0' },
    { name: 'Dr. Karim Fassi', specialty: 'Généraliste', rating: 4.6, location: 'Rabat', available: true, initials: 'KF', avatarBg: '#fef3c7', avatarColor: '#92400e' },
    { name: 'Dr. Nadia Moussaoui', specialty: 'Pédiatre', rating: 4.9, location: 'Casablanca', available: false, initials: 'NM', avatarBg: '#dcfce7', avatarColor: '#166534' },
    { name: 'Dr. Youssef Alami', specialty: 'Dermatologue', rating: 4.7, location: 'Marrakech', available: true, initials: 'YA', avatarBg: '#ede9fe', avatarColor: '#5b21b6' },
    { name: 'Dr. Fatima Zahrae', specialty: 'Cardiologue', rating: 4.5, location: 'Fès', available: true, initials: 'FZ', avatarBg: '#fce7f3', avatarColor: '#9d174d' },
  ];

  filteredDoctors = [...this.allDoctors];

  constructor(private router: Router) {}

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.filterDoctors();
  }

  filterDoctors() {
    this.filteredDoctors = this.allDoctors.filter(doc => {
      const matchesFilter = this.activeFilter === 'Tous' || doc.specialty === this.activeFilter;
      const matchesSearch = doc.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            doc.specialty.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }

  goToBooking(doctor: any) {
    this.router.navigate(['/booking'], { state: { doctor } });
  }
}
