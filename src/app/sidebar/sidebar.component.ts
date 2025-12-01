import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
@Component({
  selector: 'app-sidebar',
  imports: [ RouterModule ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {

  @Input() moduleName: string = "";
  username: string = "";
  constructor(private cookieService: CookieService, private router:Router) {}
  
  ngOnInit(): void {
    this.username = this.cookieService.get("userId");
  }
  onSidebarLinkClick() {
    // Tentukan breakpoint mobile AdminLTE (biasanya di bawah 992px)
    const mobileBreakpoint = 992;

    // Cek apakah layar saat ini lebih kecil dari breakpoint
    if (window.innerWidth < mobileBreakpoint) {
      
      // Ini adalah bagian pentingnya:
      // Kita hapus class 'sidebar-open' dari <body> secara manual
      // untuk 'memaksa' sidebar mobile menutup.
      document.body.classList.remove('sidebar-open');
    }
  }
}
