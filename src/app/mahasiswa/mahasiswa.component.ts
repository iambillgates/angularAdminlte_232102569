import { AfterViewInit, Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { FooterComponent } from "../footer/footer.component";
import { HttpClient } from '@angular/common/http';

declare const $: any;

@Component({
  selector: 'app-mahasiswa',
  imports: [HeaderComponent, SidebarComponent, FooterComponent],
  templateUrl: './mahasiswa.component.html',
  styleUrl: './mahasiswa.component.css',
})
export class MahasiswaComponent implements AfterViewInit {
  data: any;
  table1: any;

  
  constructor(private httpClient: HttpClient) {}

  ngAfterViewInit(): void {
    this.table1 = $("#table1").DataTable();

    this.bindMahasiswa();
  }

  bindMahasiswa(): void {
  this.httpClient.get("https://stmikpontianak.cloud/011100862/tampilMahasiswa.php")
    .subscribe((data: any) => {
      console.table(data);

      // Clear the table first
      this.table1.clear();

      // Loop through each record in the data
      data.forEach((element: any) => {
        // Combine birth place and date
        const tempatTanggalLahir = element.TempatLahir + ", " + element.TanggalLahir;

        // Format gender with FontAwesome icon
        let jenisKelaminFormatted = element.JenisKelamin;
        const jkLower = element.JenisKelamin.toLowerCase();

        if (jkLower === "perempuan") {
          jenisKelaminFormatted += " <i class='fas fa-venus text-danger'></i>";
        } else if (jkLower === "laki-laki") {
          // Assuming "laki-laki" is the other common value
          jenisKelaminFormatted += " <i class='fas fa-mars text-primary'></i>";
        }

        // Create an array for the row
        const row = [
          element.NIM,
          element.Nama,
          jenisKelaminFormatted,
          tempatTanggalLahir,
          element.JP,
          element.Alamat,
          element.StatusNikah,
          element.TahunMasuk
        ];

        // Add the new row to the table's buffer
        this.table1.row.add(row);
      });

      // Draw the table once after adding all rows
      // This is much more efficient than drawing inside the loop
      this.table1.draw(false);
    });
  }
}
