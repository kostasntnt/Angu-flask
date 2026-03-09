import { Component } from '@angular/core';

@Component({
  selector: 'app-userhome',
  templateUrl: './userhome.component.html',
  styleUrl: './userhome.component.css'
})
export class UserhomeComponent {
  menuOpen= false;

  toggleMenu(){
    this.menuOpen =!this.menuOpen;
  }

  dropdownOpen = false;

toggleDropMenu() {
  this.dropdownOpen = !this.dropdownOpen;
}

items = [
  {title:'Dedomena' , content: 'asdasdasdasds'}
]

}
