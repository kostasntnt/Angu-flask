import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderPageComponent } from './layouts/second-layout/header-page/header-page.component';
import { LoginComponent } from './layouts/second-layout/login/login.component';
import { SignupComponent } from './layouts/second-layout/signup/signup.component';
import { HomeComponent } from './layouts/second-layout/home/home.component';
import { ContactComponent } from './layouts/second-layout/contact/contact.component';
import { UserhomeComponent } from './layouts/main-layout/userhome/userhome.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout/main-layout.component';
import { SecondLayoutComponent } from './layouts/second-layout/second-layout/second-layout.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    HeaderPageComponent,
    LoginComponent,
    SignupComponent,
    HomeComponent,
    ContactComponent,
    UserhomeComponent,
    MainLayoutComponent,
    SecondLayoutComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule ,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
