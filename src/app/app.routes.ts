import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './admin/admin.component';
import { RegisterComponent } from './register/register.component';
import { Dashboard2Component } from './dashboard2/dashboard2.component';
import { Dashboard3Component } from './dashboard3/dashboard3.component';
import { MahasiswaComponent } from './mahasiswa/mahasiswa.component';
import { otentikasiGuard } from './otentikasi.guard';
import { LogoutComponent } from './logout/logout.component';

export const routes: Routes = [
    { path: "", redirectTo: "login", pathMatch: "full" },
    { path: "admin", component: AdminComponent},
    { path: "dashboard", component: DashboardComponent, canActivate: [otentikasiGuard] },
    { path: "dashboard2", component: Dashboard2Component, canActivate: [otentikasiGuard] },
    { path: "dashboard3", component: Dashboard3Component, canActivate: [otentikasiGuard]},
    { path: "mahasiswa", component: MahasiswaComponent, canActivate: [otentikasiGuard] },
    { path: "login", component: LoginComponent},
    { path: "logout", component: LogoutComponent},
    { path: "register", component: RegisterComponent}
];
