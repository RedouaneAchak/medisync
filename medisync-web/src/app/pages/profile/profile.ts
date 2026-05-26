import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
})
export class Profile {
  name = 'Hamza Benkirane';
  phone = '+212 6 12 34 56 78';
  email = 'hamza@medisync.ma';
}
