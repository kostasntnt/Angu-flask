import { Component, OnInit } from '@angular/core';
import { TravelService } from '../../../services/travel.service';

@Component({
  selector: 'app-my-trip',
  templateUrl: './my-trip.component.html',
  styleUrls: ['./my-trip.component.css']
})
export class MyTripComponent implements OnInit {
  userQuery: string = '';
  tripResult: any = null;
  nearbySuggestions: any[] = [];
  
  // Αυτή η μεταβλητή πρέπει να συμφωνεί με το HTML
  userCity: string = ''; 
  
  isLoading: boolean = false;
  isLoadingNearby: boolean = false;

  constructor(private travelService: TravelService) {}

  ngOnInit() {
    this.loadNearbyProposals();
  }

  loadNearbyProposals() {
    this.isLoadingNearby = true;
    
    // 1. Λήψη συντεταγμένων από τον Browser
    this.travelService.getCurrentLocation()
      .then(coords => {
        console.log("Browser Coordinates:", coords);
        
        // 2. Αποστολή στον Flask
        this.travelService.getNearbyRecommendations(coords.lat, coords.lng)
          .subscribe({
            next: (res: any) => {
              console.log("Flask Response:", res);
              // Εδώ παίρνουμε τα δεδομένα από το JSON του Flask
              this.nearbySuggestions = res.suggestions;
              this.userCity = res.user_city; // Ενημέρωση της πόλης
              this.isLoadingNearby = false;
            },
            error: (err) => {
              console.error("Flask Error:", err);
              this.isLoadingNearby = false;
            }
          });
      })
      .catch(err => {
        console.error("Geolocation failed:", err);
        this.userCity = "Πρέβεζα (Προεπιλογή)";
        this.isLoadingNearby = false;
      });
  }

  generateAiTrip() {
    if (!this.userQuery.trim()) return;
    this.isLoading = true;
    this.tripResult = null;

    this.travelService.generateTrip(this.userQuery).subscribe({
      next: (data: any) => {
        this.tripResult = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // Για τα Google Maps Links και τα Image URLs
  encodeURIComponent(url: string): string {
    return window.encodeURIComponent(url);
  }

  selectSuggestion(placeName: string) {
    this.userQuery = `Πρόγραμμα για ${placeName}`;
    this.generateAiTrip();
  }
}