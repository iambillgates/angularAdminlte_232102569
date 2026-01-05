import { AfterViewInit, Component, Renderer2 } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { formatCurrency } from '@angular/common';
import { registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { FooterComponent } from "../footer/footer.component";

registerLocaleData(localeId, 'id-ID');

declare const $: any;

@Component({
  selector: 'app-crypto',
  standalone: true,
  imports: [FormsModule, HeaderComponent, SidebarComponent, FooterComponent], 
  templateUrl: './crypto.component.html',
  styleUrl: './crypto.component.css'
})
export class CryptoComponent implements AfterViewInit {
  private _table1: any;
  searchId: string = '';

  constructor(private renderer: Renderer2, private httpClient: HttpClient) {}

  ngAfterViewInit(): void {
    this._table1 = $("#table1").DataTable({
      "searching": false,
      "paging": true, 
      "info": true,
      "pageLength": 10,
      "order": [[ 0, "asc" ]] // Default urutkan berdasarkan Kolom 0 (Rank)
    });

    this.getTop50Coins(); 
  }

  getTop50Coins(): void {
    console.log("Mengambil Top 50 Coins...");
    const url = 'https://api.coinpaprika.com/v1/tickers?quotes=IDR';

    this.httpClient.get(url).subscribe({
      next: (data: any) => {
        const top50 = data.slice(0, 50);
        this._table1.clear();
        top50.forEach((coin: any) => {
           this.addRowToTable(coin);
        });
        this._table1.draw(false);
      },
      error: (err) => console.error(err)
    });
  }

  searchCoin(): void {  
    if (!this.searchId) {
      this.getTop50Coins();
      return;
    }

    const keyword = this.searchId.toLowerCase().trim();
    const searchUrl = `https://api.coinpaprika.com/v1/search?q=${keyword}&c=currencies&limit=1`;

    this.httpClient.get(searchUrl).subscribe({
      next: (searchResult: any) => {
        if (searchResult.currencies && searchResult.currencies.length > 0) {
          const bestMatchId = searchResult.currencies[0].id;
          this.getPriceById(bestMatchId);
        } else {
          alert(`Koin '${keyword}' tidak ditemukan.`);
        }
      },
      error: (err) => console.error(err)
    });
  }

  getPriceById(coinId: string): void {
    const tickerUrl = `https://api.coinpaprika.com/v1/tickers/${coinId}?quotes=IDR`;

    this.httpClient.get(tickerUrl).subscribe({
      next: (data: any) => {
        this._table1.clear();
        this.addRowToTable(data);
        this._table1.draw(false);
      },
      error: (err) => console.error(err)
    });
  }

  // --- LOGIC UTAMA DISINI ---
  addRowToTable(data: any): void {
    // 1. Ambil Rank
    const rank = data.rank; 
    
    const name = data.name;
    const symbol = data.symbol;
    const price = data.quotes?.IDR?.price || 0;
    const percentChange = data.quotes?.IDR?.percent_change_24h || 0;

    // URL Logo
    const image = `https://static.coinpaprika.com/coin/${data.id}/logo.png`;

    // 2. Format Rupiah
    const formatPrice = formatCurrency(price, 'id-ID', 'Rp ', 'IDR', '1.0-2');
    
    // 3. GABUNGKAN LOGO DAN NAMA (Menggunakan Flexbox biar rapi sejajar)
    const combinedNameHtml = `
      <div style="display: flex; align-items: center;">
        <img src="${image}" style="width: 30px; height: 30px; margin-right: 10px;" onerror="this.src='https://via.placeholder.com/30?text=?'">
        <div>
          <div style="font-weight: bold;">${name}</div>
          <small class="text-muted">${symbol}</small>
        </div>
      </div>
    `;

    // Indikator Warna
    const color = percentChange >= 0 ? 'text-success' : 'text-danger';
    const icon = percentChange >= 0 ? '▲' : '▼';
    
    const priceHtml = `
      <div style="font-weight:bold;">${formatPrice}</div>
      <small class="${color}">${icon} ${percentChange}%</small>
    `;

    // 4. Masukkan ke Tabel: [Rank, Nama+Logo, Harga]
    this._table1.row.add([
      rank,             // Kolom 1
      combinedNameHtml, // Kolom 2
      priceHtml         // Kolom 3
    ]);
  }
}