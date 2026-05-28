import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
  templateUrl: './profile.html',
})
export class Profile {
  name = 'Hamza Benkirane';
  phone = '+212 6 12 34 56 78';
  email = 'hamza@medisync.ma';

  constructor(private readonly authService: AuthService) {
    const user = this.authService.currentUser();
    if (user) {
      this.name = `${user.firstname} ${user.lastname}`;
      this.email = user.email;
    }
  }
}
