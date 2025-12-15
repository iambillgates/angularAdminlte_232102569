import { AfterViewInit, Component, Renderer2 } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

declare const $: any;
declare const moment: any;

@Component({
  selector: 'app-cuaca',
  imports: [HeaderComponent, SidebarComponent, RouterModule],
  templateUrl: './cuaca.component.html',
  styleUrl: './cuaca.component.css',
})
export class CuacaComponent implements AfterViewInit{
  private table1: any;

  constructor(private renderer: Renderer2, private http: HttpClient){
    this.renderer.removeClass(document.body, "sidebar-open");
    this.renderer.addClass(document.body, "sidebar-closed");
  }

  ngAfterViewInit(): void {
  this.table1 = $("#table1").DataTable({
    columnDefs: [
      {
        targets: 0,
        render: function (data: string) {
          const waktu = moment(data + " UTC");
          console.log(waktu);

          const html =
            waktu.local().format("YYYY-MM-DD") + "<br />" + waktu.local().format("HH:mm") + " WIB";

          return html;
        },
      }, {
        targets: [1],
        render: function (data: string) {
          return "<img src='" + data + "' style='filter: drop-shadow(5px 5px 10px rgba(0, 0, 0, 0.7));' />";
        }
      }, {
        targets: [2],
        render: function (data: string) {
          const array = data.split("||");
          const cuaca = array[0];
          const description = array[1];
          const html = "<strong>" + cuaca + "</strong> <br />" + description;

          return html;
        },
      },
    ],
  });
}

  getData(city: string): void {
  city = encodeURIComponent(city);

  this.http
    .get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=67f7f49f9fc7faea9580f7220ad08697`)
    .subscribe(
      (data: any) => {
        let list = data.list;
        console.log(list);

        this.table1.clear();

        list.forEach((element: any) => {
          // 1. Ambil Data Cuaca & Icon
          const weather = element.weather[0];
          const iconUrl = "https://openweathermap.org/img/wn/" + weather.icon + "@2x.png";
          const cuacaDeskripsi = weather.main + " || " + weather.description;

          // 2. Ambil Data Utama (Suhu, Humidity, Angin)
          const main = element.main;
          const wind = element.wind; // Tambahan: Objek angin

          // Hitung Suhu
          const tempMin = this.kelvinToCelcius(main.temp_min);
          const tempMax = this.kelvinToCelcius(main.temp_max);
          
          // Ambil Humidity & Wind Speed
          const humidity = main.humidity;
          const windSpeed = wind.speed;

          
          const keterangan = `
            <strong>Temp:</strong> ${tempMin}°C - ${tempMax}°C <br />
            <strong>Wind:</strong> ${windSpeed} m/s <br />
            <strong>Hum:</strong> ${humidity}%
          `;

          // 4. Masukkan ke baris tabel
          const row = [
            element.dt_txt, 
            iconUrl, 
            cuacaDeskripsi, 
            keterangan 
          ];

          this.table1.row.add(row);
        });

        this.table1.draw(false);
      },
      (error: any) => {
        alert("Gagal mengambil data: " + error.error.message);
        this.table1.clear();
        this.table1.draw(false);
      }
    );
}

  kelvinToCelcius(kelvin: any): any {
    let celcius = kelvin -273.15;
    celcius = Math.round(celcius * 100) / 100;

    return celcius;
  }

  handleEnter(event: any) {
    const cityName = event.target.value;

    if (cityName == "") {
      this.table1.clear();
      this.table1.draw(false);
    }
    this.getData(cityName);
  }
}
