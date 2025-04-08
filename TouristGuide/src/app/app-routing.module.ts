import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './layouts/second-layout/login/login.component';
import { HeaderPageComponent } from './layouts/second-layout/header-page/header-page.component';
import { SignupComponent } from './layouts/second-layout/signup/signup.component';
import { AppComponent } from './app.component';
import { HomeComponent } from './layouts/second-layout/home/home.component';
import { ContactComponent } from './layouts/second-layout/contact/contact.component';
import { UserhomeComponent } from './layouts/main-layout/userhome/userhome.component';
import { SecondLayoutComponent } from './layouts/second-layout/second-layout/second-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout/main-layout.component';

const routes: Routes = [
{ 
  path:'', component: SecondLayoutComponent,
  children:[
    { path: 'login', component: LoginComponent },

    { path: 'contact', component: ContactComponent},
  
    { path: 'signup', component: SignupComponent},

    { path: '', component:HomeComponent},

    

  ]
},
{
  path:'', component:MainLayoutComponent,
  children:[
    { path: 'userhome', component:UserhomeComponent}
  ]
}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
