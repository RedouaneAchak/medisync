import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab-bar',
  templateUrl: './tab-bar.component.html',
  styleUrls: ['./tab-bar.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class TabBarComponent {
  @Input() currentPage: string = 'home';

  constructor(private router: Router) {}

  navigate(page: string) {
    this.router.navigate(['/' + page]);
  }
}
