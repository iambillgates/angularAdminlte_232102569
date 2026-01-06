import { AfterViewInit, Component, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatCurrency, registerLocaleData, CommonModule } from '@angular/common';
import localeId from '@angular/common/locales/id';
import html2canvas from 'html2canvas';

// --- IMPORT DARI LIGHTWEIGHT CHARTS V5 ---
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, UTCTimestamp, Time } from 'lightweight-charts';

registerLocaleData(localeId, 'id-ID');

declare const $: any;

interface Position {
  id: number;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  closePrice?: number;
  currentPrice: number;
  margin: number;
  leverage: number;
  size: number;
  amountCoin: number;
  liquidationPrice: number;
  pnl: number;
  pnlPercent: number;
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
  timestamp: number;
}

@Component({
  selector: 'app-trading',
  standalone: true,
  imports: [FormsModule, CommonModule], 
  templateUrl: './trading.component.html',
  styleUrl: './trading.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingComponent implements AfterViewInit, OnDestroy {
  private _tableMarket: any;
  private ws: WebSocket | undefined;
  timeframes: string[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
  selectedTimeframe: string = '1m';
  currentYear: number = new Date().getFullYear();
  // --- DATA UTAMA ---
  watchlist: string[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT'];
  marketPrices: { [key: string]: number } = {}; 
  priceBuffer: { [key: string]: number } = {}; // Buffer Anti-Lag
  
  // State Akun
  balance: number = 1000;
  totalDeposit: number = 0;
  totalProfit: number = 0;
  totalLoss: number = 0;

  // Input & Form
  inputDeposit: number = 0;
  inputCoinAdd: string = ''; 
  selectedLeverage: number = 20;
  inputMargin: number = 10;
  
  // Chart Variables
  selectedCoin: string = 'BTCUSDT'; 
  wsState: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
  private chart: IChartApi | null = null;
  // Perhatikan tipe data generic ini
  private candleSeries: ISeriesApi<"Candlestick"> | null = null;
  private lastCandle: any = null;
  
  // Posisi Trading
  openPositions: Position[] = [];
  historyPositions: Position[] = [];
  
  // UI Flags
  activeTab: 'POSITIONS' | 'HISTORY' = 'POSITIONS';
  showShareModal: boolean = false;
  shareData: Position | null = null;
  isGeneratingImage: boolean = false;
  private uiUpdateInterval: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.loadFromStorage();
    
    // Init DataTable Market Watch
    this._tableMarket = $("#tableMarket").DataTable({
      "searching": true, "paging": false, "info": false, "ordering": false, "dom": 't' 
    });

    this.initMarketTable();
    
    // Init Chart
    this.initChart();
    
    // Load Data Awal
    this.changeCoin(this.selectedCoin);
    this.connectWebSocket();

    // Loop UI Update (Anti-Lag)
    this.uiUpdateInterval = setInterval(() => {
        this.processBufferedUpdates();
    }, 1000);
  }

  changeTimeframe(tf: string): void {
    if (this.selectedTimeframe === tf) return;
    this.selectedTimeframe = tf;
    this.changeCoin(this.selectedCoin); // Reload data dengan timeframe baru
  }

  ngOnDestroy(): void {
    if (this.ws) this.ws.close();
    if (this.uiUpdateInterval) clearInterval(this.uiUpdateInterval);
    if (this.chart) this.chart.remove();
  }

  // --- 1. CHART LOGIC (UPDATED V5) ---
  initChart(): void {
    const chartContainer = document.getElementById('tv_chart_container');
    if (!chartContainer) return;

    this.chart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e2329' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      width: chartContainer.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // SYNTAX BARU V5: addSeries(CandlestickSeries, options)
    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#0ecb81', downColor: '#f6465d',
      borderUpColor: '#0ecb81', borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81', wickDownColor: '#f6465d',
    });

    window.addEventListener('resize', () => {
      if (this.chart && chartContainer) {
        this.chart.applyOptions({ width: chartContainer.clientWidth });
      }
    });
  }

  onCoinChange(): void {
    this.changeCoin(this.selectedCoin);
  }

  async changeCoin(symbol: string): Promise<void> {
    this.selectedCoin = symbol;
    
    try {
        // GUNAKAN this.selectedTimeframe DI URL
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${this.selectedTimeframe}&limit=1000`);
        const data = await response.json();
        
        const candles = data.map((d: any) => ({
            time: (d[0] / 1000) as UTCTimestamp,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
        }));

        if (this.candleSeries) {
            this.candleSeries.setData(candles);
        }

        this.lastCandle = candles[candles.length - 1];
        
        // WS tetap jalan (karena pakai @trade yg realtime, bukan @kline)
        if(this.wsState !== 'CONNECTED') this.connectWebSocket();

    } catch (error) {
        console.error("Gagal load history chart:", error);
    }
  }

  getIntervalSeconds(): number {
      const tf = this.selectedTimeframe;
      if (tf.endsWith('m')) return parseInt(tf) * 60;
      if (tf.endsWith('h')) return parseInt(tf) * 3600;
      if (tf.endsWith('d')) return parseInt(tf) * 86400;
      return 60; // Default 1m
  }

  updateChartCandle(currentPrice: number): void {
      if (!this.lastCandle || !this.candleSeries) return;

      const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
      const lastCandleTime = this.lastCandle.time as number;
      
      // LOGIKA BARU: Gunakan interval dinamis
      const intervalSeconds = this.getIntervalSeconds();
      const nextCandleTime = lastCandleTime + intervalSeconds;

      if (now >= nextCandleTime) {
          // Buat Candle Baru
          const newCandleTime = (Math.floor(now / intervalSeconds) * intervalSeconds) as UTCTimestamp;
          
          const newCandle = {
              time: newCandleTime,
              open: currentPrice,
              high: currentPrice,
              low: currentPrice,
              close: currentPrice
          };
          this.lastCandle = newCandle;
          this.candleSeries.update(newCandle);
      } else {
          // Update Candle Berjalan
          this.lastCandle.close = currentPrice;
          this.lastCandle.high = Math.max(this.lastCandle.high, currentPrice);
          this.lastCandle.low = Math.min(this.lastCandle.low, currentPrice);
          this.candleSeries.update(this.lastCandle);
      }
  }

  // --- 2. WEBSOCKET & BUFFER ---
  connectWebSocket(): void {
    if (this.ws) this.ws.close();
    
    // Gabungkan stream watchlist DAN coin yang sedang dipilih di chart
    // Biar chart tetap jalan meskipun koin tersebut tidak ada di watchlist
    const allCoins = new Set([...this.watchlist, this.selectedCoin]);
    const streams = Array.from(allCoins).map(c => `${c.toLowerCase()}@trade`).join('/');
    
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => { this.wsState = 'CONNECTED'; this.cdr.markForCheck(); };
    this.ws.onclose = () => { this.wsState = 'DISCONNECTED'; this.cdr.markForCheck(); };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const streamData = message.data;
      this.priceBuffer[streamData.s] = parseFloat(streamData.p);
    };
  }

  processBufferedUpdates(): void {
    if (Object.keys(this.priceBuffer).length === 0) return;

    for (const [symbol, price] of Object.entries(this.priceBuffer)) {
        this.marketPrices[symbol] = price;
        this.updateMarketTable(symbol, price);
        this.updatePositionsPnL(symbol, price);

        // Update Chart jika simbol cocok
        if (symbol === this.selectedCoin) {
            this.updateChartCandle(price);
        }
    }
    this.cdr.markForCheck();
  }

  // --- 3. TRADING LOGIC (Sama seperti sebelumnya) ---
  addCoinToWatchlist(): void {
    if (!this.inputCoinAdd) return;
    let symbol = this.inputCoinAdd.toUpperCase().trim();
    if (!symbol.endsWith('USDT')) symbol += 'USDT';
    if (this.watchlist.includes(symbol)) return;

    this.watchlist.push(symbol);
    this.marketPrices[symbol] = 0;
    this.inputCoinAdd = '';
    this.saveToStorage();
    this.addMarketRow(this.watchlist.length, symbol);
    this.connectWebSocket(); 
  }

  removeCoin(symbol: string): void {
    if (confirm(`Hapus ${symbol}?`)) {
      this.watchlist = this.watchlist.filter(c => c !== symbol);
      delete this.marketPrices[symbol];
      this.saveToStorage();
      this._tableMarket.clear();
      this.watchlist.forEach((coin, idx) => this.addMarketRow(idx + 1, coin));
      this._tableMarket.draw(false);
      this.connectWebSocket();
    }
  }

  openPosition(symbol: string, type: 'LONG' | 'SHORT'): void {
    const currentPrice = this.marketPrices[symbol];
    if (!currentPrice) { alert("Tunggu harga loading..."); return; }
    if (this.inputMargin > this.balance) { alert("Saldo tidak cukup!"); return; }

    this.balance -= this.inputMargin;
    const leverage = this.selectedLeverage;
    const size = this.inputMargin * leverage;
    const amountCoin = size / currentPrice;

    let liqPrice = type === 'LONG' ? currentPrice - (this.inputMargin / amountCoin) : currentPrice + (this.inputMargin / amountCoin);

    const newPos: Position = {
      id: Date.now(), symbol, type, entryPrice: currentPrice, currentPrice,
      margin: this.inputMargin, leverage, size, amountCoin, liquidationPrice: liqPrice,
      pnl: 0, pnlPercent: 0, status: 'OPEN', timestamp: Date.now()
    };
    this.openPositions.unshift(newPos);
    this.saveToStorage();
  }

  closePosition(index: number): void {
    const pos = this.openPositions[index];
    this.balance += (pos.margin + pos.pnl);
    if (pos.pnl > 0) this.totalProfit += pos.pnl; else this.totalLoss += Math.abs(pos.pnl);
    pos.status = 'CLOSED'; pos.closePrice = pos.currentPrice;
    this.historyPositions.unshift(pos);
    this.openPositions.splice(index, 1);
    this.saveToStorage();
  }

  updatePositionsPnL(symbol: string, newPrice: number): void {
    this.openPositions.forEach((pos, index) => {
      if (pos.symbol === symbol) {
        pos.currentPrice = newPrice;
        pos.pnl = pos.type === 'LONG' ? (newPrice - pos.entryPrice) * pos.amountCoin : (pos.entryPrice - newPrice) * pos.amountCoin;
        pos.pnlPercent = (pos.pnl / pos.margin) * 100;
        if (pos.pnl <= -pos.margin) this.triggerLiquidation(index, pos);
      }
    });
  }

  triggerLiquidation(index: number, pos: Position): void {
    this.totalLoss += pos.margin;
    pos.status = 'LIQUIDATED'; pos.closePrice = pos.liquidationPrice; pos.pnl = -pos.margin; pos.pnlPercent = -100;
    this.historyPositions.unshift(pos);
    this.openPositions.splice(index, 1);
    this.saveToStorage();
  }

  depositFunds(): void {
    if (this.inputDeposit > 0) {
      this.balance += this.inputDeposit; this.totalDeposit += this.inputDeposit; this.inputDeposit = 0;
      this.saveToStorage(); alert("Deposit Berhasil!");
    }
  }

  openShareModal(pos: Position): void { this.shareData = pos; this.showShareModal = true; }
  closeShareModal(): void { this.showShareModal = false; this.shareData = null; }

  downloadCard(): void {
    this.isGeneratingImage = true;
    const element = document.getElementById('pnlCardToRender');
    if (element) {
      html2canvas(element, { scale: 2, useCORS: true, backgroundColor: null }).then((canvas) => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = `PnL_${this.shareData?.symbol}.png`;
        link.click();
        this.isGeneratingImage = false;
      });
    }
  }

  saveToStorage(): void {
    if(this.historyPositions.length > 50) this.historyPositions = this.historyPositions.slice(0, 50);
    localStorage.setItem('tradeSimData', JSON.stringify({
      balance: this.balance, watchlist: this.watchlist, history: this.historyPositions,
      totalDeposit: this.totalDeposit, totalProfit: this.totalProfit, totalLoss: this.totalLoss
    }));
  }

  loadFromStorage(): void {
    const saved = localStorage.getItem('tradeSimData');
    if (saved) {
      const data = JSON.parse(saved);
      this.balance = data.balance || 1000; this.watchlist = data.watchlist || this.watchlist;
      this.historyPositions = data.history || []; this.totalDeposit = data.totalDeposit || 0;
      this.totalProfit = data.totalProfit || 0; this.totalLoss = data.totalLoss || 0;
    }
  }

  initMarketTable(): void {
    this._tableMarket.clear();
    this.watchlist.forEach((code, index) => { this.addMarketRow(index + 1, code); });
  }

  addMarketRow(rank: number, symbol: string): void {
    let iconUrl = `https://assets.coincap.io/assets/icons/${symbol.replace('USDT','').toLowerCase()}@2x.png`;
    const pairHtml = `<div style="display:flex;align-items:center;"><img src="${iconUrl}" width="20" style="margin-right:8px;" onerror="this.style.display='none'"><b>${symbol}</b></div>`;
    const removeBtn = `<button class="btn btn-xs btn-outline-danger delete-coin-btn" style="border:none;">&times;</button>`;
    
    this._tableMarket.row.add([pairHtml, '<span class="price-placeholder">...</span>', removeBtn]).draw(false);
    
    const self = this;
    $('#tableMarket tbody').off('click', '.delete-coin-btn').on('click', '.delete-coin-btn', function(e: any) {
        // @ts-ignore
        const text = $(this).closest('tr').find('b').text();
        self.removeCoin(text);
    });
  }

  updateMarketTable(symbol: string, price: number): void {
    const formatPrice = formatCurrency(price, 'en-US', '$', 'USD', '1.2-5');
    this._tableMarket.rows().every(function (rowIdx: any) {
      // @ts-ignore
      const data = this.data();
      if (data[0].includes(symbol)) {
        data[1] = `<span style="font-family:monospace; font-weight:bold;">${formatPrice}</span>`;
        // @ts-ignore
        this.data(data).draw(false);
      }
    });
  }
}