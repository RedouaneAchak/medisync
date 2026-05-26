export type StatusTone = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

export interface Doctor {
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

export interface Appointment {
  id: number;
  doctor: string;
  patient: string;
  specialty: string;
  date: string;
  time: string;
  room: string;
  type: string;
  status: string;
  tone: StatusTone;
}

export const doctors: Doctor[] = [
  {
    id: 1,
    name: 'Dr. Sara Benali',
    specialty: 'Cardiologie',
    city: 'Casablanca',
    clinic: 'Clinique Atlas',
    languages: 'Francais, Arabe, Anglais',
    rating: 4.9,
    price: 450,
    nextSlot: 'Demain, 09:30',
    available: true,
    initials: 'SB',
  },
  {
    id: 2,
    name: 'Dr. Karim Fassi',
    specialty: 'Medecine generale',
    city: 'Rabat',
    clinic: 'Cabinet Fassi',
    languages: 'Francais, Arabe',
    rating: 4.7,
    price: 250,
    nextSlot: 'Aujourd hui, 14:00',
    available: true,
    initials: 'KF',
  },
  {
    id: 3,
    name: 'Dr. Nadia Moussaoui',
    specialty: 'Pediatrie',
    city: 'Casablanca',
    clinic: 'Centre Enfance',
    languages: 'Francais, Arabe',
    rating: 4.8,
    price: 320,
    nextSlot: 'Jeudi, 10:30',
    available: false,
    initials: 'NM',
  },
  {
    id: 4,
    name: 'Dr. Youssef Alami',
    specialty: 'Dermatologie',
    city: 'Marrakech',
    clinic: 'Polyclinique Menara',
    languages: 'Francais, Arabe, Espagnol',
    rating: 4.6,
    price: 380,
    nextSlot: 'Vendredi, 16:00',
    available: true,
    initials: 'YA',
  },
];

export const appointments: Appointment[] = [
  {
    id: 1001,
    doctor: 'Dr. Sara Benali',
    patient: 'Hamza Benkirane',
    specialty: 'Cardiologie',
    date: '10 juin 2026',
    time: '09:30',
    room: 'A-204',
    type: 'Suivi',
    status: 'Confirme',
    tone: 'green',
  },
  {
    id: 1002,
    doctor: 'Dr. Karim Fassi',
    patient: 'Meryem Alaoui',
    specialty: 'Medecine generale',
    date: '10 juin 2026',
    time: '14:00',
    room: 'B-112',
    type: 'Premiere visite',
    status: 'En attente',
    tone: 'yellow',
  },
  {
    id: 1003,
    doctor: 'Dr. Nadia Moussaoui',
    patient: 'Adam El Idrissi',
    specialty: 'Pediatrie',
    date: '12 juin 2026',
    time: '10:30',
    room: 'C-018',
    type: 'Controle',
    status: 'A rappeler',
    tone: 'blue',
  },
];

export const patients = [
  {
    name: 'Hamza Benkirane',
    category: 'ADULT',
    phone: '+212 6 12 34 56 78',
    company: 'Individuel',
    lastVisit: '12 mars 2026',
    blood: 'A+',
  },
  {
    name: 'Meryem Alaoui',
    category: 'CORPORATE',
    phone: '+212 6 98 76 54 32',
    company: 'OCP Care',
    lastVisit: '28 avril 2026',
    blood: 'O+',
  },
  {
    name: 'Adam El Idrissi',
    category: 'MINOR',
    phone: '+212 6 44 11 22 33',
    company: 'Guardian: Salma El Idrissi',
    lastVisit: '5 avril 2026',
    blood: 'B-',
  },
];

export const consultations = [
  {
    date: '5 avril 2026',
    doctor: 'Dr. Nadia Moussaoui',
    motif: 'Suivi pediatrique',
    notes: 'Evolution stable, prochain controle dans 3 mois.',
    prescriptions: ['Vitamine D', 'Serum physiologique'],
  },
  {
    date: '12 mars 2026',
    doctor: 'Dr. Sara Benali',
    motif: 'Controle cardiaque',
    notes: 'Tension surveillee, ECG normal.',
    prescriptions: ['Amlodipine 5mg', 'Kardegic 75mg'],
  },
];

export const invoices = [
  {
    id: 'FAC-2026-071',
    patient: 'Hamza Benkirane',
    appointment: 'Cardiologie - 10 juin',
    amount: 450,
    method: 'Carte',
    paid: true,
  },
  {
    id: 'FAC-2026-072',
    patient: 'Meryem Alaoui',
    appointment: 'Generale - 10 juin',
    amount: 250,
    method: 'Assurance',
    paid: false,
  },
  {
    id: 'FAC-2026-073',
    patient: 'Adam El Idrissi',
    appointment: 'Pediatrie - 12 juin',
    amount: 320,
    method: 'Especes',
    paid: false,
  },
];

export const rooms = [
  { number: 'A-204', equipment: 'ECG, monitoring', doctor: 'Dr. Sara Benali', status: 'Occupee' },
  { number: 'B-112', equipment: 'Generaliste', doctor: 'Dr. Karim Fassi', status: 'Libre' },
  { number: 'C-018', equipment: 'Pediatrie', doctor: 'Dr. Nadia Moussaoui', status: 'Preparation' },
  { number: 'D-031', equipment: 'Dermatologie', doctor: 'Dr. Youssef Alami', status: 'Libre' },
];

export const notifications = [
  {
    title: 'Rappel de rendez-vous',
    detail: 'Consultation avec Dr. Sara Benali demain a 09:30.',
    time: 'Il y a 12 min',
    tone: 'blue' as StatusTone,
  },
  {
    title: 'Facture en attente',
    detail: 'FAC-2026-072 attend la confirmation assurance.',
    time: 'Il y a 1 h',
    tone: 'yellow' as StatusTone,
  },
  {
    title: 'Document ajoute',
    detail: 'Analyse sang.pdf a ete archivee dans le dossier medical.',
    time: 'Hier',
    tone: 'green' as StatusTone,
  },
];
