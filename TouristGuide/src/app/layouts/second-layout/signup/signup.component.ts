import { Component } from '@angular/core';
import { SignupService } from '../../../services/signup.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})


export class SignupComponent {

  user = {
    firstname:'' ,
    lastname:'' ,
    email:'' ,
    username:'' ,
    password:'' ,
    confirmpassword:'' 

  };

  constructor(private signupService: SignupService){}
  
  
  /*   kaleitai sthn upovolh ths formas */
  onSignup() {
    if (this.user.password !== this.user.confirmpassword){
      alert('Ο κωδικός δεν είναι ο ίδιος')
    
    return;
    }

/* kaloume gia na steiloyme ta dedomena backend*/
  
  this.signupService.signup(this.user).subscribe(
    response => {
      console.log('Επιτυχής εγγραφή', response);
      alert('Η εγγραφή ολοκληρώθηκε!');
    } ,
    error => {
      console.error('Σφάλμα εγγραφής', error);
      alert('Παρουσιάστηκε σφάλμα κατά την εγγραφή!');
    }
  );
  
  }
}
