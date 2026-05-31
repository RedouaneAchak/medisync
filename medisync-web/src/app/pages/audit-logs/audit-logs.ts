import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-audit-logs',
  standalone: true,imports: [DatePipe],
  templateUrl: './audit-logs.html',
})
export class AuditLogs implements OnInit {
  logs: any[] = [];
  loading = true;
  error = '';

  constructor(
    private readonly api: MedisyncApiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  private loadLogs(): void {
    this.loading = true;
    // Make sure getAuditLogs() exists in your MedisyncApiService!
    this.api.getAuditLogs().subscribe({
      next: (data) => {
        this.logs = data;
        this.loading = false;
        this.cdr.detectChanges(); // <-- Fixes the double-click bug
      },
      error: (err) => {
        console.error('Erreur chargement logs', err);
        this.error = 'Impossible de charger les logs d\'audit.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}