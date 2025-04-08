import { Component } from '@angular/core';

@Component({
  selector: 'app-header-page',
  templateUrl: './header-page.component.html',
  styleUrl: './header-page.component.css'
})


export class HeaderPageComponent {
  menuOpen= false;

  toggleMenu(){
    this.menuOpen =!this.menuOpen;
  }
}

