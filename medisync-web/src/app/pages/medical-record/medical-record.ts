import { Component } from '@angular/core';
import { consultations } from '../../data/medisync-data';

@Component({
  selector: 'app-medical-record',
  templateUrl: './medical-record.html',
})
export class MedicalRecord {
  consultations = consultations;
  documents = ['Analyse sang.pdf', 'Radio thorax.jpg', 'ECG mars 2026.pdf'];
}
