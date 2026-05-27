import { Component, OnInit } from '@angular/core';
import { TravelService } from '../../../services/travel.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  // Ορισμός του helper 
  encodeURIComponent = window.encodeURIComponent;

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
    event.stopPropagation();
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

  deleteTrip(trip: any, event: Event) {
    event.stopPropagation();
    if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το ταξίδι;')) {
      this.travelService.deleteTrip(trip._id).subscribe({
        next: () => {
          this.allTrips = this.allTrips.filter(t => t._id !== trip._id);
          this.applyFilter();
        },
        error: (err) => console.error("Error deleting trip:", err)
      });
    }
  }


    //  Μέθοδοι για τα νέα features
    exportToPDF(): void {
    if (!this.selectedTrip) return;

    const element = document.getElementById('modal-pdf-content');
    const scrollContainer = document.querySelector('.modal-content-scroll') as HTMLElement;
    
    if (!element) {
      console.error('Δεν βρέθηκε το περιεχόμενο του modal');
      return;
    }

    // Αρχικές CSS τιμές για να τις επαναφέρουμε μετά
    const originalModalMaxHeight = element.style.maxHeight;
    const originalModalHeight = element.style.height;
    const originalScrollOverflow = scrollContainer ? scrollContainer.style.overflowY : '';
    const originalScrollMaxHeight = scrollContainer ? scrollContainer.style.maxHeight : '';

    // Κρύβουμε τα κουμπιά ενεργειών και το "X" κλεισίματος για να μην βγουν στο PDF
    const actionsWrapper = element.querySelector('.modal-actions-wrapper') as HTMLElement;
    const closeBtn = element.querySelector('.close-btn') as HTMLElement;
    if (actionsWrapper) actionsWrapper.style.visibility = 'hidden'; // Χρησιμοποιούμε visibility για να μην χαλάσει το layout
    if (closeBtn) closeBtn.style.visibility = 'hidden';

    // Force expand του Modal ώστε να φανεί ολο το κρυμμένο κείμενο
    element.style.maxHeight = 'none';
    element.style.height = 'auto';
    if (scrollContainer) {
      scrollContainer.style.overflowY = 'visible';
      scrollContainer.style.maxHeight = 'none';
    }

    // Μικρή καθυστέρηση render του browser στο  modal
    setTimeout(() => {
      html2canvas(element, {
        scale: 2, // Υψηλή ανάλυση 
        useCORS: true,
        logging: false,
        windowHeight: element.scrollHeight // Αναγκάζουμε το canvas να διαβάσει όλο το πραγματικό ύψος
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        
        // Δημιουργία PDF A4
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 190; 
        const pageHeight = 277; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 10;

        // Προσθήκη πρώτης σελίδας με περιθώρια
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Διαχείριση πολλαπλών σελίδων αν το ταξίδι είναι μεγάλο
        while (heightLeft > 0) {
          position = heightLeft - imgHeight + 10; // offset για την επόμενη σελίδα
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        //  ΕΠΑΝΑΦΟΡΑ ΤΟΥ UI στην αρχική του κατάσταση (Μαζεύουμε πάλι το modal με scroll)
        element.style.maxHeight = originalModalMaxHeight;
        element.style.height = originalModalHeight;
        if (scrollContainer) {
          scrollContainer.style.overflowY = originalScrollOverflow;
          scrollContainer.style.maxHeight = originalScrollMaxHeight;
        }
        if (actionsWrapper) actionsWrapper.style.visibility = 'visible';
        if (closeBtn) closeBtn.style.visibility = 'visible';

        // Αποθήκευση αρχείου
        const filename = `Trip_${this.selectedTrip?.location || 'Plan'}.pdf`;
        pdf.save(filename);

      }).catch(err => {
        console.error('Σφάλμα κατά την παραγωγή του PDF:', err);
        // Επαναφορά σε περίπτωση σφάλματος
        element.style.maxHeight = originalModalMaxHeight;
        element.style.height = originalModalHeight;
        if (scrollContainer) {
          scrollContainer.style.overflowY = originalScrollOverflow;
          scrollContainer.style.maxHeight = originalScrollMaxHeight;
        }
        if (actionsWrapper) actionsWrapper.style.visibility = 'visible';
        if (closeBtn) closeBtn.style.visibility = 'visible';
      });
    }, 150); // καθυστερηση για re render
  }

sendToEmail(): void {
    if (!this.selectedTrip) return;

    // mail απο χρηστη
    const userEmail = prompt('Παρακαλώ εισάγετε το email σας για την αποστολή του προγράμματος:');
    
    if (!userEmail) return; 
    if (!userEmail.includes('@')) {
      alert('Παρακαλώ εισάγετε ένα έγκυρο email.');
      return;
    }

    const element = document.getElementById('modal-pdf-content');
    const scrollContainer = document.querySelector('.modal-content-scroll') as HTMLElement;
    
    if (!element) {
      console.error('Δεν βρέθηκε το περιεχόμενο του modal');
      return;
    }

    alert('Η προετοιμασία του email ξεκίνησε. Παρακαλώ περιμένετε λίγα δευτερόλεπτα...');

    //  Κρατάμε τις αρχικές CSS τιμές για επαναφορά
    const originalModalMaxHeight = element.style.maxHeight;
    const originalModalHeight = element.style.height;
    const originalScrollOverflow = scrollContainer ? scrollContainer.style.overflowY : '';
    const originalScrollMaxHeight = scrollContainer ? scrollContainer.style.maxHeight : '';

    // Κρύβουμε τα UI κουμπιά
    const actionsWrapper = element.querySelector('.modal-actions-wrapper') as HTMLElement;
    const closeBtn = element.querySelector('.close-btn') as HTMLElement;
    if (actionsWrapper) actionsWrapper.style.visibility = 'hidden';
    if (closeBtn) closeBtn.style.visibility = 'hidden';

    //  Ξεδιπλώνουμε το modal για να τραβήξουμε όλο το κείμενο
    element.style.maxHeight = 'none';
    element.style.height = 'auto';
    if (scrollContainer) {
      scrollContainer.style.overflowY = 'visible';
      scrollContainer.style.maxHeight = 'none';
    }

    //  Δημιουργία του Snapshot με βελτιστοποιημένο μέγεθος
    setTimeout(() => {
      html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        windowHeight: element.scrollHeight
      }).then((canvas) => {
        
        // Μετατροπή σε JPEG με 60% ποιότητα
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.6);

        // Επαναφορά του UI στην οθόνη του χρήστη
        element.style.maxHeight = originalModalMaxHeight;
        element.style.height = originalModalHeight;
        if (scrollContainer) {
          scrollContainer.style.overflowY = originalScrollOverflow;
          scrollContainer.style.maxHeight = originalScrollMaxHeight;
        }
        if (actionsWrapper) actionsWrapper.style.visibility = 'visible';
        if (closeBtn) closeBtn.style.visibility = 'visible';


        //  Μετατρέπουμε το base64 string σε κανονικό Blob αρχείο
        const imageBlob = this.base64ToBlob(imageBase64, 'image/jpeg');

        //  Δημιουργούμε το FormData payload
        const formData = new FormData();
        formData.append('email', userEmail);
        formData.append('location', this.selectedTrip.location);
        
        // Επισυνάπτουμε το Blob δίνοντάς του ένα όνομα αρχείου 
        formData.append('file', imageBlob, 'trip-plan.jpg');

        //  Κλήση του TravelService στέλνοντας πλέον το formData αντί για σκέτα strings
        this.travelService.sendTripEmail(formData)
          .subscribe({
            next: (response: any) => {
              alert('🚀 Το email στάλθηκε επιτυχώς! Ελέγξτε τα εισερχόμενά σας.');
            },
            error: (err) => {
              console.error('Σφάλμα κατά την αποστολή του email:', err);
              alert('Υπήρξε κάποιο πρόβλημα κατά την αποστολή του email. Παρακαλώ βεβαιωθείτε ότι το backend είναι ανοιχτό.');
            }
          });

      }).catch(err => {
        console.error('Σφάλμα κατά τη δημιουργία του Base64:', err);
        element.style.maxHeight = originalModalMaxHeight;
        element.style.height = originalModalHeight;
        if (scrollContainer) {
          scrollContainer.style.overflowY = originalScrollOverflow;
          scrollContainer.style.maxHeight = originalScrollMaxHeight;
        }
        if (actionsWrapper) actionsWrapper.style.visibility = 'visible';
        if (closeBtn) closeBtn.style.visibility = 'visible';
      });
    }, 150);
}


private base64ToBlob(base64Data: string, contentType: string): Blob {
    // Αφαιρούμε το πρόθεμα "data:image/jpeg;base64," αν υπάρχει
    const block = base64Data.split(';');
    const realData = block[1] ? block[1].split(',')[1] : block[0].split(',')[1];
    
    const sliceSize = 512;
    const byteCharacters = atob(realData);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}


  } 

