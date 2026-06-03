
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BackendDoctor, BackendDoctorFeedbackSummary, MedisyncApiService } from '../../services/medisync-api.service';
import { Subject, debounceTime, forkJoin, switchMap, takeUntil } from 'rxjs';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
interface DoctorCard {
  id: number;
  name: string;
  specialty: string;
  city: string;
  clinic: string;
  languages: string;
  rating: number;
  price: number;
  available: boolean;
  initials: string;
}

@Component({
  selector: 'app-doctors',
  imports: [FormsModule, RouterLink],
  templateUrl: './doctors.html',
})
export class Doctors implements OnInit, OnDestroy {
  doctors: DoctorCard[] = [];
  specialties: string[] = ['Tous'];
  query = '';
  specialty = 'Tous';
  loading = false;
  error = '';
  message = '';
  private doctorFeedbackMap = new Map<number, BackendDoctorFeedbackSummary>();

  private search$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(private readonly api: MedisyncApiService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.search$.pipe(
      // 400ms: only fires when the user pauses typing, not on every keystroke.
      // switchMap cancels any in-flight request if the user types again before
      // the response arrives, so results always match the latest input.
      debounceTime(400),
      switchMap(() => {
        this.loading = true;
        this.error   = '';
        this.message = '';
        const hasFilter = this.query.trim() || this.specialty !== 'Tous';
        return hasFilter
          ? this.api.searchDoctors(this.specialty, this.query)
          : this.api.getDoctors();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next:  (items) => this.handleResults(items),
      error: ()      => this.handleError(),
    });

    // Initial load bypasses debounce — fires immediately on page open
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(): void {
    this.search$.next();
  }

  private loadAll(): void {
    this.loading = true;
    this.error   = '';
    this.message = '';
    forkJoin({
      doctors: this.api.getDoctors(),
      summaries: this.api.getDoctorFeedbackSummaries(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next:  ({ doctors, summaries }) => {
        this.doctorFeedbackMap = new Map(summaries.map((item) => [item.doctorId, item]));
        this.handleResults(doctors);
      },
      error: ()      => this.handleError(),
    });
  }

private handleResults(items: BackendDoctor[]): void {
    this.doctors = items.map(d => this.toCard(d));
    const specs  = items.map(d => d.specialty).filter((s): s is string => !!s);
    this.specialties = ['Tous', ...new Set(specs)];
    this.message = items.length ? '' : 'Aucun médecin ne correspond à cette recherche.';
    this.loading = false;
    
    // 3. Force Angular to draw the HTML immediately!
    this.cdr.detectChanges(); 
  }

  private handleError(): void {
    this.doctors = [];
    this.error   = 'Impossible de charger les médecins. Vérifiez que le serveur est en ligne.';
    this.loading = false;
  }

  private toCard(d: BackendDoctor): DoctorCard {
    const first = d.user?.firstname ?? '';
    const last  = d.user?.lastname  ?? `#${d.id}`;
    return {
      id:        d.id,
      name:      `Dr. ${first} ${last}`.trim(),
      specialty: d.specialty  ?? 'Médecine générale',
      city:      'Casablanca',
      clinic:    'MediSync',
      languages: d.spokenLanguages ?? 'Français, Arabe',
      rating:    Number((this.doctorFeedbackMap.get(d.id)?.averageRating ?? 4.7).toFixed(1)),
      price:     d.standardConsultationRate ?? 300,
      available: true,
      initials:  `${first[0] ?? 'M'}${last[0] ?? 'D'}`.toUpperCase(),
    };
  }
}
