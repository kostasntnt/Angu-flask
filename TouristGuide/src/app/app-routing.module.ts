import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

//Layouts
import { SecondLayoutComponent } from './layouts/second-layout/second-layout/second-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout/main-layout.component';

//Components
import { LoginComponent } from './layouts/second-layout/login/login.component';
import { HeaderPageComponent } from './layouts/second-layout/header-page/header-page.component';
import { SignupComponent } from './layouts/second-layout/signup/signup.component';
import { AppComponent } from './app.component';
import { HomeComponent } from './layouts/second-layout/home/home.component';
import { ContactComponent } from './layouts/second-layout/contact/contact.component';
import { UserhomeComponent } from './layouts/main-layout/userhome/userhome.component';
import { MyTripComponent } from './layouts/main-layout/my-trip/my-trip.component';
import { CostsComponent } from './layouts/main-layout/costs/costs.component';
import { ReviewsComponent } from './layouts/main-layout/reviews/reviews.component';
import { MapComponent } from './layouts/main-layout/map/map.component';
import { HistoryComponent} from './layouts/main-layout/history/history.component';
import { MycustomtripComponent } from './layouts/main-layout/mycustomtrip/mycustomtrip.component';
// Guard
import { authGuard } from './auth.guard';

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
  path:'user', 
  component:MainLayoutComponent,
  canActivate: [authGuard],
  children:[
    { path: 'userhome', component:UserhomeComponent},
    { path: 'my-trip', component: MyTripComponent },
    { path: 'costs', component: CostsComponent },
    { path: 'reviews', component: ReviewsComponent },
    { path: 'map', component: MapComponent },
    { path: 'history', component: HistoryComponent }, // <-- ΜΟΝΟ ΑΥΤΗ Η ΠΡΟΣΘΗΚΗ
    { path: 'my-custom-trip', component: MycustomtripComponent },
    { path: '', redirectTo: 'userhome', pathMatch: 'full' },
    
  ]
},
{ path: '**', redirectTo: '' } // Redirect αν γραφτεί λάθος URL

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
