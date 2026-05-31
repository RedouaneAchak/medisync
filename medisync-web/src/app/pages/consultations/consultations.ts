import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-consultations',
  standalone: true,imports: [DatePipe],
  templateUrl: './consultations.html',
})
export class Consultations implements OnInit {
  consultations: any[] = [];
  loading = true;
  error = '';

  constructor(
    private readonly api: MedisyncApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadConsultations();
  }

  private loadConsultations(): void {
    this.loading = true;
    // Make sure getConsultations() exists in your MedisyncApiService!
    this.api.getConsultations().subscribe({
      next: (data) => {
        this.consultations = data;
        this.loading = false;
        this.cdr.detectChanges(); // <-- Wakes up Angular instantly!
      },
      error: (err) => {
        console.error('Erreur chargement consultations', err);
        this.error = 'Impossible de charger les consultations depuis la base de données.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}