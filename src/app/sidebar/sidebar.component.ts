import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [ RouterModule ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input() moduleName: string = "";

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
