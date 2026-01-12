import { AfterViewInit, Component, Renderer2 } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { FooterComponent } from "../footer/footer.component"; // Pastikan ada footer
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // Penting untuk *ngIf dan pipe number
import * as L from 'leaflet'; // Import Leaflet

declare const $: any;
declare const moment: any;

@Component({
  selector: 'app-cuaca',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, FooterComponent, RouterModule, CommonModule],
  templateUrl: './cuaca.component.html',
  styleUrl: './cuaca.component.css',
})
export class CuacaComponent implements AfterViewInit {
  private table1: any;
  public currentWeather: any = null; // Data untuk Card Atas
  public todayDate: string = "";
  private map: any; // Variabel untuk Peta

  constructor(private renderer: Renderer2, private http: HttpClient) {
    this.renderer.removeClass(document.body, "sidebar-open");
    this.renderer.addClass(document.body, "sidebar-closed");
    this.todayDate = moment().format('DD MMM YYYY');
  }

  ngAfterViewInit(): void {
    this.table1 = $("#table1").DataTable({
      columnDefs: [
        {
          targets: 0,
          render: function (data: string) {
            const waktu = moment.utc(data);
            return waktu.local().format("YYYY-MM-DD") + "<br />" + waktu.local().format("HH:mm") + " WIB";
          },
        },
        {
          targets: [1],
          render: function (data: string) {
            return "<img src='" + data + "' style='filter: drop-shadow(5px 5px 10px rgba(0, 0, 0, 0.7));' />";
          },
        },
        {
          targets: [2],
          render: function (data: string) {
            const array = data.split("||");
            return "<strong>" + array[0] + "</strong> <br />" + array[1];
          },
        },
      ],
    });
    this.getData("Pontianak");
  }

  getData(city: string): void {
    if (!city) return;
    city = encodeURIComponent(city);
    const apiKey = "67f7f49f9fc7faea9580f7220ad08697"; // Ganti dengan API Key Anda sendiri jika limit

    // 1. AMBIL DATA CUACA SAAT INI (Current Weather)
    this.http.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`)
      .subscribe((data: any) => {
        this.currentWeather = data; // Simpan data ke variabel
        
        // Inisialisasi Peta setelah data didapat
        setTimeout(() => {
          this.initMap(data.coord.lat, data.coord.lon);
        }, 100);
      }, (err) => {
        alert("Kota tidak ditemukan (Current Weather)");
      });

    // 2. AMBIL DATA FORECAST (Untuk Tabel)
    this.http.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}`)
      .subscribe((data: any) => {
        let list = data.list;
        this.table1.clear();

        list.forEach((element: any) => {
          const weather = element.weather[0];
          const iconUrl = "https://openweathermap.org/img/wn/" + weather.icon + "@2x.png";
          const cuacaDeskripsi = weather.main + " || " + weather.description;
          
          // Data untuk kolom Keterangan
          const tempMin = this.kelvinToCelcius(element.main.temp_min);
          const tempMax = this.kelvinToCelcius(element.main.temp_max);
          const windSpeed = element.wind.speed;
          const humidity = element.main.humidity;

          const keterangan = `
            <strong>Temp:</strong> ${tempMin}°C - ${tempMax}°C <br />
            <strong>Wind:</strong> ${windSpeed} m/s <br />
            <strong>Hum:</strong> ${humidity}%
          `;

          const row = [element.dt_txt, iconUrl, cuacaDeskripsi, keterangan];
          this.table1.row.add(row);
        });

        this.table1.draw(false);
      }, (error: any) => {
        // Error handling
      });
  }

  // --- Fungsi Helper untuk HTML ---

  initMap(lat: number, lon: number) {
    // Hapus map lama jika sudah ada (agar tidak error map already initialized)
    if (this.map) {
      this.map.remove();
    }

    // Buat map baru
    this.map = L.map('map-container').setView([lat, lon], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    L.marker([lat, lon]).addTo(this.map)
      .bindPopup(`Lokasi: ${this.currentWeather.name}`)
      .openPopup();
  }

  kelvinToCelcius(kelvin: any): any {
    return (kelvin - 273.15).toFixed(0);
  }

  getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  }

  getWindDirection(deg: number): string {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[val % 16];
  }

  handleEnter(event: any) {
    const cityName = event.target.value;
    if (cityName && cityName.trim() !== "") {
      this.getData(cityName);
    }
  }
}