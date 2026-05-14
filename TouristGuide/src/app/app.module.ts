import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

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
import { MyTripComponent } from './layouts/main-layout/my-trip/my-trip.component';
import { CostsComponent } from './layouts/main-layout/costs/costs.component';
import { ReviewsComponent } from './layouts/main-layout/reviews/reviews.component';
import { MapComponent } from './layouts/main-layout/map/map.component';
import { HistoryComponent } from './layouts/main-layout/history/history.component';




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
    SecondLayoutComponent,
    MyTripComponent,
    CostsComponent,
    ReviewsComponent,
    MapComponent,
    HistoryComponent,


  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule,
    FormsModule ,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
