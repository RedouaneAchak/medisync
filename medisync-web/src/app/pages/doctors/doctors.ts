import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BackendDoctor, MedisyncApiService } from '../../services/medisync-api.service';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  city: string;
  clinic: string;
  languages: string;
  rating: number;
  price: number;
  nextSlot: string;
  available: boolean;
  initials: string;
}

@Component({
  selector: 'app-doctors',
  imports: [FormsModule, RouterLink],
  templateUrl: './doctors.html',
})
export class Doctors {
  doctors: Doctor[] = [];
  query = '';
  specialty = 'Tous';
  loading = false;
  error = '';
  message = '';

  specialties = ['Tous'];

  constructor(private readonly api: MedisyncApiService) {
    this.loadDoctors();
  }

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

  loadDoctors(): void {
    this.loading = true;
    this.error = '';
    this.message = '';
    const request = this.query.trim() || this.specialty !== 'Tous'
      ? this.api.searchDoctors(this.specialty, this.query)
      : this.api.getDoctors();

    request.subscribe({
      next: (items) => {
        this.doctors = items.map((doctor) => this.toDoctorCard(doctor));
        this.specialties = ['Tous', ...new Set([...this.specialties.filter((item) => item !== 'Tous'), ...this.doctors.map((doctor) => doctor.specialty)])];
        if (!items.length) {
          this.message = 'Aucun medecin ne correspond a cette recherche.';
        }
        this.loading = false;
      },
      error: () => {
        this.doctors = [];
        this.error = 'Recherche impossible. Verifiez que les medecins existent dans la table doctors et sont lies a un user DOCTOR.';
        this.loading = false;
      },
    });
  }

  private toDoctorCard(doctor: BackendDoctor): Doctor {
    const firstname = doctor.user?.firstname ?? 'Dr.';
    const lastname = doctor.user?.lastname ?? `#${doctor.id}`;
    const name = `${firstname} ${lastname}`.startsWith('Dr.') ? `${firstname} ${lastname}` : `Dr. ${firstname} ${lastname}`;
    return {
      id: doctor.id,
      name,
      specialty: doctor.specialty ?? 'Medecine generale',
      city: 'Casablanca',
      clinic: 'MediSync',
      languages: doctor.spokenLanguages ?? 'Francais, Arabe',
      rating: 4.7,
      price: doctor.standardConsultationRate ?? 300,
      nextSlot: 'Voir disponibilites',
      available: true,
      initials: `${firstname[0] ?? 'M'}${lastname[0] ?? 'D'}`.toUpperCase(),
    };
  }
}
