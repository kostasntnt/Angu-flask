import { Component, OnInit } from '@angular/core';
import { TravelService } from '../../../services/travel.service'; 
import { Router } from '@angular/router';

@Component({
  selector: 'app-mycustomtrip',
  templateUrl: './mycustomtrip.component.html',
  styleUrls: ['./mycustomtrip.component.css']
})
export class MycustomtripComponent implements OnInit {
  searchQuery: string = '';
  currentStepData: any = null;
  isSearching: boolean = false;
  tripSteps: any[] = [];
  userLocationName: string = 'Εντοπισμός τοποθεσίας...';

  constructor(
    private travelService: TravelService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.detectUserLocation();
  }

  detectUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocationName = 'Η τοποθεσία μου';
        },
        (error) => {
          this.userLocationName = 'Αθήνα (Προεπιλογή)';
        }
      );
    } else {
      this.userLocationName = 'Αθήνα (Προεπιλογή)';
    }
  }

  searchLocation(): void {
    if (!this.searchQuery || !this.searchQuery.trim()) return;

    this.isSearching = true;

    const origin = this.tripSteps.length === 0 
      ? this.userLocationName 
      : this.tripSteps[this.tripSteps.length - 1].name;

    
    setTimeout(() => {
      this.currentStepData = {
        name: this.searchQuery,
        description: `Ανακαλύψτε τα κρυμμένα διαμάντια στο ${this.searchQuery}. Ένας προορισμός που συνδυάζει μοναδικά τοπία και τοπική κουλτούρα.`,
        origin_city: origin,
        distance_km: Math.floor(Math.random() * 100) + 15, 
        travel_time: '1ω 30λ',
        images: [
          `https://images.unsplash.com/photo-1500622944204-b135684e99fd?q=80&w=400&h=300&auto=format&fit=crop`,
          `https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&h=300&auto=format&fit=crop`
        ]
      };
      this.isSearching = false;
    }, 1000);
  }

  addToTrip(): void {
    if (this.currentStepData) {
      this.tripSteps.push({ ...this.currentStepData });
      this.currentStepData = null;
      this.searchQuery = '';
    }
  }

  removeStep(index: number): void {
    this.tripSteps.splice(index, 1);
    
    // Επανυπολογισμός αλυσίδας
    if (this.tripSteps.length > index) {
      const newCurrent = this.tripSteps[index];
      newCurrent.origin_city = (index === 0) 
        ? this.userLocationName 
        : this.tripSteps[index - 1].name;
    }
  }

  saveFinalTrip(): void {
    if (this.tripSteps.length === 0) {
      alert('Προσθέστε τουλάχιστον έναν προορισμό!');
      return;
    }
    //  Εμφάνιση παραθύρου για το όνομα (Prompt)
  // Προτείνουμε  όνομα βασισμένο στον πρώτο προορισμό
  const defaultName = `Ταξίδι προς ${this.tripSteps[0].name}`;
  const customName = prompt('Πώς θέλετε να ονομάσετε αυτή τη διαδρομή;', defaultName);

  //  Αν ο χρήστης πατήσει "Cancel" (το customName θα είναι null), ακυρώνουμε την αποθήκευση
  if (customName === null) {
    return;
  }

    const totalDist = this.tripSteps.reduce((sum, step) => sum + step.distance_km, 0);

    const tripPayload = {
      title: customName.trim() || defaultName,
      steps: this.tripSteps,
      total_distance: totalDist
    };

    // Κλήση του Service για αποθήκευση στη MongoDB
    this.travelService.saveSequentialTrip(tripPayload).subscribe({
      next: (res) => {
        alert('Η διαδρομή αποθηκεύτηκε επιτυχώς στα Αγαπημένα! ❤️');
        this.router.navigate(['/user/history']); 
      },
      error: (err) => {
        console.error('Save failed:', err);
        alert('Παρουσιάστηκε πρόβλημα κατά την αποθήκευση. Δοκιμάστε ξανά.');
      }
    });
  }
}