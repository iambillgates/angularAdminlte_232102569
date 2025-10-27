import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from "../header/header.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-dashboard3',
  imports: [RouterModule, HeaderComponent, SidebarComponent, FooterComponent],
  templateUrl: './dashboard3.component.html',
  styleUrl: './dashboard3.component.css'
})
export class Dashboard3Component {

}
