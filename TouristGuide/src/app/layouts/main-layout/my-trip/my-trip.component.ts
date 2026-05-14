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
  nearbySuggestions: any[] = []; // Αρχικοποίηση ως άδεια λίστα
  userCity: string = ''; 
  isLoading: boolean = false;
  isLoadingNearby: boolean = false;

  constructor(private travelService: TravelService) {}

  ngOnInit() {
    this.loadNearbyProposals();
  }

  loadNearbyProposals() {
    this.isLoadingNearby = true;
    this.travelService.getCurrentLocation()
      .then(coords => {
        this.travelService.getNearbyRecommendations(coords.lat, coords.lng)
          .subscribe({
            next: (res: any) => {
              // ΔΙΟΡΘΩΣΗ: Χρήση του σωστού κλειδιού 'nearbySuggestions' από το Flask
              this.nearbySuggestions = res.nearbySuggestions || [];
              this.userCity = res.user_city || 'Ελλάδα';
              this.isLoadingNearby = false;
            },
            error: (err) => {
              console.error("Flask Error:", err);
              this.nearbySuggestions = []; // Ασφάλεια για να μη σκάσει το length
              this.isLoadingNearby = false;
            }
          });
      })
      .catch(err => {
        console.error("Geolocation failed:", err);
        this.userCity = "Αθήνα";
        this.isLoadingNearby = false;
        this.nearbySuggestions = [];
      });
  }

  generateAiTrip() {
    if (!this.userQuery.trim()) return;
    this.isLoading = true;
    this.tripResult = null;

    this.travelService.generateTrip(this.userQuery).subscribe({
      next: (data: any) => {
        // Διασφάλιση ότι οι μέρες υπάρχουν
        if (data && !data.days) {
          data.days = [];
        }
        this.tripResult = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  saveTrip() {
    if (!this.tripResult || !this.tripResult._id) {
      alert('Σφάλμα: Δεν βρέθηκε το ID του ταξιδιού.');
      return;
    }

    this.travelService.toggleFavorite(this.tripResult._id).subscribe({
      next: (response: any) => {
        this.tripResult.is_favorite = response.is_favorite;
        if (response.is_favorite) {
          alert('Προστέθηκε στα αγαπημένα! ❤️');
        } else {
          alert('Αφαιρέθηκε από τα αγαπημένα.');
        }
      },
      error: (err) => {
        console.error('Toggle favorite error:', err);
        alert('Πρόβλημα κατά την αποθήκευση.');
      }
    });
  }

  encodeURIComponent(url: string): string {
    return window.encodeURIComponent(url);
  }

  selectSuggestion(placeName: string) {
    this.userQuery = `Πρόγραμμα για ${placeName}`;
    this.generateAiTrip();
  }
}