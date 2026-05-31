import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendDoctor } from '../../services/medisync.models';

interface SearchDoctor {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  location: string;
  available: boolean;
  initials: string;
  avatarBg: string;
  avatarColor: string;
}

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, TabBarComponent],
})
export class SearchPage {
  searchQuery = '';
  activeFilter = 'Tous';
  filters: string[] = ['Tous'];
  allDoctors: SearchDoctor[] = [];
  filteredDoctors: SearchDoctor[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly router: Router,
    private readonly api: MedisyncApiService,
  ) {}

  ionViewWillEnter(): void {
    this.loadDoctors();
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterDoctors();
  }

  filterDoctors(): void {
    this.filteredDoctors = this.allDoctors.filter((doctor) => {
      const matchesFilter = this.activeFilter === 'Tous' || doctor.specialty === this.activeFilter;
      const matchesSearch =
        doctor.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }

  goToBooking(doctor: SearchDoctor): void {
    void this.router.navigate(['/booking'], { state: { doctor } });
  }

  private loadDoctors(): void {
    this.loading = true;
    this.error = '';

    this.api.getDoctors().subscribe({
      next: (doctors: BackendDoctor[]) => {
        this.loading = false;
        this.allDoctors = doctors.map((doctor, index) => this.toSearchDoctor(doctor, index));
        this.filters = ['Tous', ...new Set(this.allDoctors.map((doctor) => doctor.specialty))];
        this.filterDoctors();
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger les médecins depuis le backend.';
        this.allDoctors = [];
        this.filteredDoctors = [];
      },
    });
  }

  private toSearchDoctor(doctor: BackendDoctor, index: number): SearchDoctor {
    const palette = [
      { bg: '#dbeafe', color: '#1565C0' },
      { bg: '#fef3c7', color: '#92400e' },
      { bg: '#dcfce7', color: '#166534' },
      { bg: '#ede9fe', color: '#5b21b6' },
    ];
    const firstName = doctor.user?.firstname ?? 'Dr';
    const lastName = doctor.user?.lastname ?? `${doctor.id}`;
    const colors = palette[index % palette.length];

    return {
      id: doctor.id,
      name: `Dr. ${firstName} ${lastName}`.trim(),
      specialty: doctor.specialty ?? 'Médecine générale',
      rating: 4.8,
      location: 'MediSync',
      available: true,
      initials: `${firstName[0] ?? 'D'}${lastName[0] ?? 'R'}`.toUpperCase(),
      avatarBg: colors.bg,
      avatarColor: colors.color,
    };
  }
}
