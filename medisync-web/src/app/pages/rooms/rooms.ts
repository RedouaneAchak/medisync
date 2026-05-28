import { Component } from '@angular/core';
import { rooms } from '../../data/medisync-data';
import { BackendRoom, MedisyncApiService } from '../../services/medisync-api.service';

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.html',
})
export class Rooms {
  rooms = rooms;
  error = '';

  constructor(private readonly api: MedisyncApiService) {
    this.api.getRooms().subscribe({
      next: (items) => {
        this.rooms = items.map((room) => this.toRoomCard(room));
      },
      error: () => {
        this.error = 'Connectez-vous pour charger les salles depuis le backend.';
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
