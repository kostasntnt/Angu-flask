import { Component, ChangeDetectorRef } from '@angular/core';
import { TravelService } from '../../../services/travel.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent {
  destination: string = '';
  duration: number = 3; 
  season: 'winter' | 'summer' = 'summer';
  isLongTrip: boolean = false;
  isLoading: boolean = false;
  tripResult: any = null;

  prefs = {
    culture: false,
    nature: false,
    fun: false,
    relax: false
  };

  constructor(
    private travelService: TravelService,
    private cdr: ChangeDetectorRef
  ) {}

  // Πιο "έξυπνη" λήψη κειμένου για να αποφύγουμε τα [object Object]
  getActivityText(activity: any): string {
    if (!activity) return '';
    if (typeof activity === 'string') return activity;
    return activity.description || activity.activity || activity.title || 'Δραστηριότητα';
  }

  setDuration(days: number) {
    this.duration = days;
    this.isLongTrip = false;
  }

  enableLongTrip() {
    this.isLongTrip = true;
    if (this.duration < 5) this.duration = 5;
  }

  generateCustomTrip() {
    if (!this.destination) {
      alert('Παρακαλώ εισάγετε έναν προορισμό!');
      return;
    }

    this.isLoading = true;
    this.tripResult = null; 

    const selectedMoods = Object.keys(this.prefs)
      .filter(key => (this.prefs as any)[key])
      .map(key => this.translateMood(key));

    const tripRequest = {
      location: this.destination,
      days: this.duration,
      style: selectedMoods,
      season: this.season === 'winter' ? 'Χειμώνας' : 'Καλοκαίρι'
    };

    this.travelService.generateCustomTrip(tripRequest).subscribe({
      next: (response) => {
        this.tripResult = response;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Full Error Object:', err);
        this.isLoading = false;
        alert('Σφάλμα: ' + (err.error?.error || 'Αποτυχία σύνδεσης με τον διακομιστή'));
      }
    });
  }

  // ΔΙΟΡΘΩΜΕΝΗ SAVE TRIP ΜΕ API CALL
  saveTrip() {
    if (!this.tripResult || !this.tripResult._id) {
      alert('Σφάλμα: Δεν βρέθηκε το ID του ταξιδιού.');
      return;
    }

    this.travelService.toggleFavorite(this.tripResult._id).subscribe({
      next: (response: any) => {
        // Ενημερώνουμε την τοπική μεταβλητή για να αλλάξει το UI (καρδιά/κείμενο)
        this.tripResult.is_favorite = response.is_favorite;
        
        if (response.is_favorite) {
          alert('Προστέθηκε στα αγαπημένα! ❤️');
        } else {
          alert('Αφαιρέθηκε από τα αγαπημένα.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Toggle favorite error:', err);
        alert('Αποτυχία ενημέρωσης αγαπημένων. Βεβαιωθείτε ότι είστε συνδεδεμένοι.');
      }
    });
  }

  private translateMood(mood: string): string {
    const map: any = {
      culture: 'Ιστορία & Πολιτισμός',
      nature: 'Φύση',
      fun: 'Διασκέδαση',
      relax: 'Χαλάρωση'
    };
    return map[mood] || mood;
  }
}