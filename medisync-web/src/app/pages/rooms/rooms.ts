import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BackendRoom, MedisyncApiService } from '../../services/medisync-api.service';

interface RoomCard {
  number: string;
  equipment: string;
  doctor: string;
  status: string;
}

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.html',
})
export class Rooms implements OnInit { // 1. Implémentation de OnInit
  rooms: RoomCard[] = [];
  error = '';

  constructor(
    private readonly api: MedisyncApiService,
    private readonly cdr: ChangeDetectorRef // 2. Injection du ChangeDetectorRef
  ) {}

  // 3. Déplacement de l'appel API du constructor vers ngOnInit
  ngOnInit(): void {
    this.api.getRooms().subscribe({
      next: (items) => {
        this.rooms = items.map((room) => this.toRoomCard(room));
        this.cdr.detectChanges(); // 4. Forçage du rafraîchissement immédiat
      },
      error: () => {
        this.error = 'Connectez-vous pour charger les salles depuis le backend.';
        this.cdr.detectChanges(); // 4. Forçage du rafraîchissement immédiat
      },
    });
  }

  private toRoomCard(room: BackendRoom) {
    return {
      number: room.roomNumber,
      equipment: room.equipmentType ?? 'Consultation',
      doctor: 'Affectation selon planning',
      status: 'Libre',
    };
  }
}