import { AfterViewInit, Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatCurrency, registerLocaleData, CommonModule } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { FooterComponent } from "../footer/footer.component";

registerLocaleData(localeId, 'id-ID');

declare const $: any;

// Interface untuk Posisi Trading
interface Position {
  id: number;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  margin: number;       // Modal yang ditaruh
  leverage: number;     // Leverage yang dipakai
  size: number;         // Total size (Margin x Leverage)
  amountCoin: number;   // Jumlah koin yang didapat
  liquidationPrice: number;
  pnl: number;          // Profit/Loss dalam USDT
  pnlPercent: number;   // Profit/Loss dalam %
}

@Component({
  selector: 'app-trading',
  standalone: true,
  imports: [FormsModule, HeaderComponent, SidebarComponent, FooterComponent, CommonModule], 
  templateUrl: './trading.component.html',
  styleUrl: './trading.component.css'
})
export class TradingComponent implements AfterViewInit, OnDestroy {
  private _tableMarket: any;
  private ws: WebSocket | undefined;
  
  // --- STATE AKUN (Saldo & Setting) ---
  balance: number = 1000; // Saldo Awal $1000
  inputDeposit: number = 0;
  
  // Setting Trading
  selectedLeverage: number = 10; // Default 10x
  inputMargin: number = 10;      // Default bet $10
  
  // Data
  marketPrices: { [key: string]: number } = {}; // Simpan harga live disini
  openPositions: Position[] = [];
  
  private streamNames = 'btcusdt@trade/ethusdt@trade/solusdt@trade/xrpusdt@trade/bnbusdt@trade/dogeusdt@trade';

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    // Table Market Watch (Kiri)
    this._tableMarket = $("#tableMarket").DataTable({
      "searching": false, "paging": false, "info": false, "ordering": false 
    });

    this.initMarketTable();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    if (this.ws) this.ws.close();
  }

  // --- FITUR DEPOSIT ---
  depositFunds(): void {
    if (this.inputDeposit > 0) {
      this.balance += this.inputDeposit;
      alert(`Berhasil deposit $${this.inputDeposit}. Saldo baru: $${this.balance}`);
      this.inputDeposit = 0;
    }
  }

  // --- FITUR TRADING (LOGIC UTAMA) ---
  openPosition(symbol: string, type: 'LONG' | 'SHORT'): void {
    const currentPrice = this.marketPrices[symbol];

    if (!currentPrice) {
      alert("Tunggu harga muncul dulu!");
      return;
    }

    if (this.inputMargin > this.balance) {
      alert("Saldo tidak cukup!");
      return;
    }

    // 1. Kurangi Saldo
    this.balance -= this.inputMargin;

    // 2. Hitung Detail Posisi
    const leverage = this.selectedLeverage;
    const positionSize = this.inputMargin * leverage; // Total nilai posisi
    const amountCoin = positionSize / currentPrice;   // Dapat berapa koin

    // 3. Hitung Liquidation Price (Rumus Sederhana Isolated)
    // Long Liq = Entry - (Margin / Amount)
    // Short Liq = Entry + (Margin / Amount)
    let liqPrice = 0;
    if (type === 'LONG') {
      liqPrice = currentPrice - (this.inputMargin / amountCoin); 
    } else {
      liqPrice = currentPrice + (this.inputMargin / amountCoin);
    }

    // 4. Buat Object Posisi
    const newPos: Position = {
      id: Date.now(),
      symbol: symbol,
      type: type,
      entryPrice: currentPrice,
      currentPrice: currentPrice,
      margin: this.inputMargin,
      leverage: leverage,
      size: positionSize,
      amountCoin: amountCoin,
      liquidationPrice: liqPrice,
      pnl: 0,
      pnlPercent: 0
    };

    this.openPositions.unshift(newPos); // Masukkan ke array (tampil di tabel bawah)
    console.log("Open Posisi:", newPos);
  }

  closePosition(index: number): void {
    const pos = this.openPositions[index];
    
    // Kembalikan Margin + Profit/Loss ke Saldo
    const returnAmount = pos.margin + pos.pnl;
    this.balance += returnAmount;

    // Hapus dari array
    this.openPositions.splice(index, 1);
  }

  // --- WEBSOCKET & REALTIME UPDATE ---
  connectWebSocket(): void {
    const url = `wss://stream.binance.com:9443/stream?streams=${this.streamNames}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const streamData = message.data;
      
      const symbol = streamData.s;     // BTCUSDT
      const price = parseFloat(streamData.p); // Harga Baru

      // 1. Simpan harga ke memory
      this.marketPrices[symbol] = price;

      // 2. Update Tabel Market Watch (Visual)
      this.updateMarketTable(symbol, price);

      // 3. Update PnL Posisi Terbuka (PENTING!)
      this.updatePositionsPnL(symbol, price);
    };
  }

  updatePositionsPnL(symbol: string, newPrice: number): void {
    // Loop semua posisi yang terbuka
    this.openPositions.forEach((pos, index) => {
      // Jika simbol cocok (misal harga BTC berubah, update posisi BTC saja)
      if (pos.symbol === symbol) {
        pos.currentPrice = newPrice;

        // Rumus PnL Futures
        // Long PnL = (HargaSekarang - Entry) * AmountCoin
        // Short PnL = (Entry - HargaSekarang) * AmountCoin
        if (pos.type === 'LONG') {
          pos.pnl = (newPrice - pos.entryPrice) * pos.amountCoin;
        } else {
          pos.pnl = (pos.entryPrice - newPrice) * pos.amountCoin;
        }

        // Hitung Persentase ROE (Return on Equity)
        pos.pnlPercent = (pos.pnl / pos.margin) * 100;

        // --- CEK LIQUIDATION ---
        // Jika PnL minus melebihi Margin (Rugi 100%), posisi hangus
        if (pos.pnl <= -pos.margin) {
           this.triggerLiquidation(index, pos);
        }
      }
    });
  }

  triggerLiquidation(index: number, pos: Position): void {
    console.warn(`LIQUIDATED: ${pos.symbol}`);
    // Hapus posisi tanpa mengembalikan saldo (Uang Hangus)
    this.openPositions.splice(index, 1);
    
    // Opsional: Tampilkan notifikasi
    // alert(`Posisi ${pos.symbol} Terlikuidasi! Margin Anda hangus.`); 
    // (Sebaiknya pakai toast notification jangan alert agar tidak ganggu loop)
  }

  // --- HELPER TABLE ---
  initMarketTable(): void {
    const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT'];
    pairs.forEach((code, index) => {
      this.marketPrices[code] = 0; 
      this.addMarketRow(index + 1, code);
    });
  }

  addMarketRow(rank: number, symbol: string): void {
    // Icon Crypto
    let iconUrl = `https://assets.coincap.io/assets/icons/${symbol.replace('USDT','').toLowerCase()}@2x.png`;
    
    // HTML Tombol Buy/Sell di Market Watch
    // Kita bind function click via jQuery event nanti atau cara hacky HTML string
    // Di Angular + DataTables, lebih aman pakai button click handler global atau row callback.
    // TAPI untuk simplifikasi, kita buat tombol ini men-trigger variable global yg dipantau.
    
    // Karena DataTables merender HTML string, event (click) Angular tidak jalan di dalam string ini.
    // Solusi sederhana: Kita taruh tombol Buy/Sell di LUAR tabel (Panel Trading) 
    // atau gunakan (click) pada tabel "Open Position" yang native Angular.
    
    // Untuk tabel Market Watch, kita tampilkan saja, actionnya kita pindah ke panel input.
    
    const pairHtml = `
      <div style="display: flex; align-items: center;">
        <img src="${iconUrl}" width="25" style="margin-right:8px;">
        <b>${symbol}</b>
      </div>
    `;

    this._tableMarket.row.add([
      rank,
      pairHtml,
      '<span class="price-placeholder">Loading...</span>'
    ]);
    this._tableMarket.draw(false);
  }

  updateMarketTable(symbol: string, price: number): void {
    const formatPrice = formatCurrency(price, 'en-US', '$', 'USD', '1.2-4');
    
    // Cari row berdasarkan teks simbol
    this._tableMarket.rows().every(function (rowIdx: any) {
      // @ts-ignore
      const data = this.data();
      if (data[1].includes(symbol)) {
        data[2] = `<span style="font-family:monospace; font-weight:bold;">${formatPrice}</span>`;
        // @ts-ignore
        this.data(data).draw(false);
      }
    });
  }
}