import { Component, OnInit } from '@angular/core';
import { TravelService } from '../../../services/travel.service';

@Component({
  selector: 'app-reviews',
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css']
})
export class ReviewsComponent implements OnInit {
  historyTrips: any[] = [];
  favoriteTrips: any[] = [];
  locationData: any[] = []; 
  selectedLocation: string = '';
  isLoading: boolean = false;
  isFetchingReviews: boolean = false;
  activeTripId: any = null; // Το κάναμε any για να μην παραπονιέται το template

  constructor(private travelService: TravelService) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  loadTrips() {
    this.isLoading = true;
    this.travelService.getMyTrips().subscribe({
      next: (data: any) => {
        this.historyTrips = data;
        this.favoriteTrips = data.filter((t: any) => t.is_favorite);
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Σφάλμα φόρτωσης ταξιδιών:", err);
        this.isLoading = false;
      }
    });
  }

  // ΕΔΩ ΕΙΝΑΙ Η ΔΙΟΡΘΩΣΗ: Προσθέσαμε το tripId ως δεύτερη παράμετρο
  fetchLocationReviews(location: string, tripId: any) {
    // Toggle logic: Αν είναι ήδη ανοιχτό, κλείστο
    if (this.activeTripId === tripId) {
      this.activeTripId = null;
      this.selectedLocation = '';
      return;
    }

    this.activeTripId = tripId;
    this.selectedLocation = location;
    this.isFetchingReviews = true;
    this.locationData = []; 

    this.travelService.getLocationReviews(location).subscribe({
      next: (res: any) => {
        console.log("Received Data:", res);
        this.locationData = res.data || [];
        this.isFetchingReviews = false;
      },
      error: (err) => {
        console.error("Σφάλμα API:", err);
        this.isFetchingReviews = false;
        this.activeTripId = null;
        alert("Παρουσιάστηκε πρόβλημα κατά την ανάκτηση των κριτικών.");
      }
    });
  }

  clearSelection() {
    this.selectedLocation = '';
    this.locationData = [];
    this.activeTripId = null;
  }
}