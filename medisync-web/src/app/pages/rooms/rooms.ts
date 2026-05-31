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
  standalone: true, // <-- Added to match your other components!
  templateUrl: './rooms.html',
})
export class Rooms implements OnInit {
  rooms: RoomCard[] = [];
  error = '';

  constructor(
    private readonly api: MedisyncApiService,
    private readonly cdr: ChangeDetectorRef // <-- INJECTED HERE
  ) {}

  ngOnInit(): void {
    this.loadRooms(); // <-- Moved to ngOnInit for best practices
  }

  private loadRooms(): void {
    this.api.getRooms().subscribe({
      next: (items) => {
        this.rooms = items.map((room) => this.toRoomCard(room));
        this.cdr.detectChanges(); // <-- WAKE UP ANGULAR
      },
      error: () => {
        this.error = 'Connectez-vous pour charger les salles depuis le backend.';
        this.cdr.detectChanges(); // <-- WAKE UP ANGULAR
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