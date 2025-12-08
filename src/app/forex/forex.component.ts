import { AfterViewInit, Component, Renderer2 } from '@angular/core';
import { FooterComponent } from "../footer/footer.component";
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { HttpClient } from '@angular/common/http'; // Pastikan HttpClientModule sudah ada di app.config/module
import { formatCurrency, DatePipe } from '@angular/common'; // Tambahkan DatePipe jika ingin cara mudah, atau pakai fungsi manual di bawah

declare const $: any;

@Component({
  selector: 'app-forex',
  standalone: true,
  imports: [FooterComponent, HeaderComponent, SidebarComponent],
  templateUrl: './forex.component.html',
  styleUrl: './forex.component.css',
})
export class ForexComponent implements AfterViewInit {
  private _table1: any;

  constructor(private renderer: Renderer2, private httpClient: HttpClient) {}

  ngAfterViewInit(): void {
    this.renderer.removeClass(document.body, "sidebar-open");
    this.renderer.addClass(document.body, "sidebar-closed");
    this.renderer.addClass(document.body, "sidebar-collapsed");

    this._table1 = $("#table1").DataTable({
      "columnDefs": [
        {
          "targets": 3,
          "className": "text-right"
        }
      ]
    });

    this.bindTable1();
  }

  bindTable1(): void {
    console.log("bindTable1()");

    const ratesUrl = "https://openexchangerates.org/api/latest.json?app_id=38fb6ec4ab9647d2976a3a72a96e14d5";
    
    // PERBAIKAN 1: Menghapus spasi pada URL (sebelumnya . org)
    const currenciesUrl = "https://openexchangerates.org/api/currencies.json";

    // Fetch the currency names
    this.httpClient.get(currenciesUrl).subscribe((currencies: any) => {

      // Fetch the exchange rates
      this.httpClient.get(ratesUrl).subscribe((data: any) => {
        
        // Mengambil timestamp
        const timestamp = data.timestamp;
        console.log(timestamp);
        
        // PERBAIKAN 2: Menambahkan method formatDate() di bawah class ini agar baris ini tidak error
        $("#tanggal").html("Data per tanggal " + this.formatDate(new Date(timestamp * 1000)));

        const rates = data.rates;
        let index = 1;

        // Iterate over the rates and add the rows to the table
        for (const currency in rates) {
          // Get the currency name from the API
          const currencyName = currencies[currency];

          // Calculate the rate for the specific currency (Konversi ke IDR)
          const rate = rates.IDR / rates[currency];

          // Format currency: value, locale, symbol, code
          const formatRate = formatCurrency(rate, "en-US", "", currency);

          console.log(`${currency}: ${currencyName} - ${formatRate}`);

          // Add the row with the index, symbol, currency name, and formatted rate
          const row = [index++, currency, currencyName, formatRate];

          this._table1.row.add(row);
        }

        // Draw tabel di luar loop
        this._table1.draw(false);
      });
    });
  }

  // PERBAIKAN 3: Menambahkan fungsi formatDate yang hilang
  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    // Menggunakan locale Indonesia (id-ID) supaya outputnya "8 Desember 2025"
    return date.toLocaleDateString('id-ID', options); 
  }
}