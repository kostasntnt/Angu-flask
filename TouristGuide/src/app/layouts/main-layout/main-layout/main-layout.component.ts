import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  // Ορίζουμε τις μεταβλητές που χρειάζεται το HTML (Navbar)
  menuOpen = false;
  dropdownOpen = false;

  constructor(private router: Router) {}

  // Η συνάρτηση για το menu (κινητά)
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // Η συνάρτηση για το προφίλ χρήστη
  toggleDropMenu() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  // Η συνάρτηση αποσύνδεσης
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    this.router.navigate(['/login']);
  }
}