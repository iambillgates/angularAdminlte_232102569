import { Component, Input, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // Disarankan ditambahkan untuk direktif standar
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-sidebar',
  standalone: true, // Wajib true jika menggunakan 'imports'
  imports: [RouterModule, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {

  @Input() moduleName: string = "";
  username: string = "";

  constructor(private cookieService: CookieService, private router: Router) {}

  ngOnInit(): void {
    // 1. Ambil Username
    this.username = this.cookieService.get("userId");

    // 2. Cek Tema (Dark/Light) saat load
    const saved = localStorage.getItem('adminlte-theme');
    const isDarkMode = saved === 'dark';

    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    }
    
    // Update warna header sesuai status awal
    this.updateHeaderState(isDarkMode);
  }

  // --- LOGIKA TEMA (DARK/LIGHT) ---
  toggleTheme(): void {
    // Toggle class di body
    document.body.classList.toggle('dark-mode');
    
    // Cek apakah sekarang jadi dark
    const isDark = document.body.classList.contains('dark-mode');

    // Update warna header
    this.updateHeaderState(isDark);

    // Simpan preferensi ke LocalStorage
    localStorage.setItem('adminlte-theme', isDark ? 'dark' : 'light');
  }

  // Helper private untuk mengubah class header (agar tidak duplikat kode)
  private updateHeaderState(isDark: boolean): void {
    const header = document.querySelector('.main-header') as HTMLElement;

    if (header) {
      if (isDark) {
        header.classList.remove('navbar-white', 'navbar-light');
        header.classList.add('navbar-dark', 'navbar-primary');
      } else {
        header.classList.remove('navbar-dark', 'navbar-primary');
        header.classList.add('navbar-white', 'navbar-light');
      }
    }
  }

  // --- LOGIKA SIDEBAR MOBILE ---
  onSidebarLinkClick() {
    // Tentukan breakpoint mobile AdminLTE (biasanya di bawah 992px)
    const mobileBreakpoint = 992;

    // Cek apakah layar saat ini lebih kecil dari breakpoint
    if (window.innerWidth < mobileBreakpoint) {
      
      // Hapus class 'sidebar-open' dari <body> secara manual
      // untuk 'memaksa' sidebar mobile menutup setelah menu diklik.
      document.body.classList.remove('sidebar-open');
    }
  }
}