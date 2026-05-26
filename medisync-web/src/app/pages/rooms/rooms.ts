import { Component } from '@angular/core';
import { rooms } from '../../data/medisync-data';

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.html',
})
export class Rooms {
  rooms = rooms;
}
