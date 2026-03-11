import { Component, OnInit } from '@angular/core';
import { TravelService } from '../../../services/travel.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  allTrips: any[] = [];
  filteredTrips: any[] = [];
  isLoading: boolean = true;
  activeTab: 'all' | 'favs' = 'all';
  selectedTrip: any = null;

  constructor(private travelService: TravelService) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  loadTrips() {
    this.isLoading = true;
    this.travelService.getMyTrips().subscribe({
      next: (data: any) => {
        this.allTrips = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Σφάλμα κατά τη φόρτωση:", err);
        this.isLoading = false;
      }
    });
  }

  applyFilter() {
    if (this.activeTab === 'all') {
      this.filteredTrips = this.allTrips;
    } else {
      this.filteredTrips = this.allTrips.filter(t => t.is_favorite);
    }
  }

  setTab(tab: 'all' | 'favs') {
    this.activeTab = tab;
    this.applyFilter();
  }

  toggleFavorite(trip: any, event: Event) {
    event.stopPropagation(); // Για να μην ανοίξει το modal όταν πατάμε την καρδιά
    this.travelService.toggleFavorite(trip._id).subscribe({
      next: (res: any) => {
        trip.is_favorite = res.is_favorite;
        if (this.activeTab === 'favs') this.applyFilter();
      }
    });
  }

  viewDetails(trip: any) {
    this.selectedTrip = trip;
  }

  closeModal() {
    this.selectedTrip = null;
  }
}