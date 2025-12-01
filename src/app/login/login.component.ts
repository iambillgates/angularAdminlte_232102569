import { Component, Renderer2 } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { HttpClient } from '@angular/common/http';

declare const $: any;
@Component({
  selector: 'app-login',
  imports: [ RouterModule ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  constructor(private renderer: Renderer2, private httpClient: HttpClient,
    private router: Router, private cookieService: CookieService
  ) {
    this.renderer.addClass(document.body, "login-page");

    this.renderer.removeClass(document.body, "sidebar-mini");
    this.renderer.removeClass(document.body, "layout-fixed");

    this.renderer.setAttribute(document.body, "style", "mini-height: 464px");


  }

  showPeringatanModal(message: string): void {
    $("#peringatanModal").modal();
    $("#pm_message").html(message);
  }

  signIn(): void {
  console.log("signIn()");

  var userId = $("#idText").val();
  userId = encodeURIComponent(userId);

  var password = $("#passwordText").val();
  password = encodeURIComponent(password);

  // FIXED: Removed space in "stmikpontianak. cloud"
  var url = "https://stmikpontianak.cloud/011100862/login.php" +
    "?id=" + userId +
    "&password=" + password;

  console.log("url : " + url);

  this.httpClient.get(url).subscribe((data: any) => {
      console.log(data);
      var row = data[0];

      // Check if login failed
      if (row.idCount != "1") {
        this.showPeringatanModal("Id atau password tidak cocok");
        return; // Stop execution here if failed
      } 
      // FIXED: Added closing brace '}' above so the code below is reachable

      // Success Logic
      this.cookieService.set("userId", userId);
      console.log("session data berhasil dibuat");
      this.router.navigate(["/dashboard"]);
    });
  }
}
