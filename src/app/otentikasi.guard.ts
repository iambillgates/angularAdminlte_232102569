import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service'; 
export const otentikasiGuard: CanActivateFn = (route, state) => {
  console.log("Otentikasi Dimulai");

  var userId = inject(CookieService).get("userId");
  console.log("userId: " + userId);

  if (userId == null) {

  } else if (userId == "undefined") {

  } else if (userId == "") {

  } else {
    return true;
  }
  
  inject(Router).navigate(["login"]);
  return false;
};
