import { Component } from '@angular/core';
import { LoginService } from '../../../services/login.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  user ={
    username:'',
    password:''
  }  

  constructor(private loginService: LoginService, private router: Router) {}

  onLogin() {
    this.loginService.login(this.user).subscribe(
      response => {
        console.log('Σύνδεση επιτυχής:', response);
        alert('Καλωσήρθες, ' + response.username);
        this.router.navigate(['/userhome']);
      },
      error => {
        console.error('Σφάλμα σύνδεσης:', error);
        alert('Λάθος στοιχεία σύνδεσης!');
      }
    );
  } 

}
