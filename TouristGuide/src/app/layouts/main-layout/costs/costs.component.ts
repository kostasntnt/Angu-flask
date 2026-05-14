import { Component, OnInit } from '@angular/core';
import { TravelService } from '../../../services/travel.service';

@Component({
  selector: 'app-costs',
  templateUrl: './costs.component.html',
  styleUrls: ['./costs.component.css']
})
export class CostsComponent implements OnInit {
  favoriteTrips: any[] = [];
  isLoading: boolean = false;
  budgetResults: any = null;
  selectedTripActivities: any[] = [];

  costData = {
    origin: '', // ΝΕΟ ΠΕΔΙΟ
    location: '',
    days: 1,
    people: 1,
    transportType: 'car'
  };

  constructor(private travelService: TravelService) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites() {
    this.travelService.getMyTrips().subscribe({
      next: (data: any) => {
        this.favoriteTrips = data.filter((t: any) => t.is_favorite);
      },
      error: (err) => console.error("Σφάλμα κατά τη φόρτωση των αγαπημένων:", err)
    });
  }

  importFromHistory(event: any) {
    const tripId = event.target.value;
    const selected = this.favoriteTrips.find(t => t._id === tripId);
    
    if (selected) {
      this.costData.location = selected.location;
      this.costData.days = selected.days_count;
      
      if (selected.trip_data && selected.trip_data.days) {
        this.selectedTripActivities = selected.trip_data.days.flatMap((d: any) => d.activities);
      } else {
        this.selectedTripActivities = [];
      }
      this.budgetResults = null;
    }
  }

  calculateBudget() {
    if (!this.costData.location || !this.costData.origin) {
      alert("Παρακαλώ εισάγετε Αφετηρία και Προορισμό!");
      return;
    }

    this.isLoading = true;
    this.budgetResults = null;

    const payload = {
      ...this.costData,
      activities: this.selectedTripActivities
    };

    this.travelService.getCostEstimation(payload).subscribe({
      next: (data: any) => {
        this.budgetResults = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Σφάλμα AI:", err);
        this.isLoading = false;
        alert("Αποτυχία λήψης εκτίμησης. Δοκιμάστε ξανά.");
      }
    });
  }
}