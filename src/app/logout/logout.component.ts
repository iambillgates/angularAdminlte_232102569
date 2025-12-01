import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.css',
})
export class LogoutComponent {
  constructor(private cookieService: CookieService, private router: Router) {}

  ngOnInit(): void {
    this.cookieService.deleteAll();

    this.router.navigate(['/login']);
  }
}
