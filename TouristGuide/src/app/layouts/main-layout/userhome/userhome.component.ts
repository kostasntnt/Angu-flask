import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // 🆕 Απαραίτητο για το API
import { ChartConfiguration, ChartData, ChartType } from 'chart.js'; // 🆕 Για το TypeScript typing του Chart
import { BaseChartDirective } from 'ng2-charts'; // 🆕 1. Εισαγωγή του Directive
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-userhome',
  templateUrl: './userhome.component.html',
  styleUrl: './userhome.component.css'
})
export class UserhomeComponent {
  menuOpen= false;

  toggleMenu(){
    this.menuOpen =!this.menuOpen;
  }

  dropdownOpen = false;

toggleDropMenu() {
  this.dropdownOpen = !this.dropdownOpen;
}

items = [
  {title:'Dedomena' , content: 'καλως ήρθατε'}
]

// 🆕 1. Πρόσθεσε τη μεταβλητή για το αν είναι ανοιχτά τα στατιστικά
  showStatistics = false;

  // 🆕 2. Πρόσθεσε τις ρυθμίσεις και τη δομή των δεδομένων για την πίτα
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right' // Εμφάνιση ονομάτων στα δεξιά της πίτας
      },
        tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed; // Το νούμερο/ποσοστό
            return ` ${label}: ${value}%`; // Επιστρέφει π.χ. "Αθήνα: 25%"
          }
        }
      }
    }
  };
  
  public pieChartData: ChartData<'pie', number[], string> = {
    labels: [],
    datasets: [ { data: [] } ]
  };
  
  public pieChartType: ChartType = 'pie';

  // 🆕 3. Βάλε τον HttpClient στον constructor σου
  constructor(private http: HttpClient) {}
  // 🆕 4. Πρόσθεσε τη συνάρτηση που ανοιγοκλείνει τα στατιστικά και καλεί το Flask
  toggleStatistics() {
    this.showStatistics = !this.showStatistics;
    
    // Αν ο χρήστης τα άνοιξε, τρέξε το request στο backend live
    if (this.showStatistics) {
      this.loadSearchStatistics();
    }
  }

  // 🆕 5. Πρόσθεσε τη συνάρτηση που φέρνει τα δεδομένα από το Flask
  loadSearchStatistics() {
    this.http.get<any[]>('http://localhost:5000/api/search-statistics').subscribe({
      next: (response) => {
        // Παίρνουμε τις τοποθεσίες και τα ποσοστά από το JSON του backend
        const locLabels = response.map(item => item.location);
        const locPercentages = response.map(item => item.percentage);

        // Ενημερώνουμε την πίτα
        this.pieChartData = {
          labels: locLabels,
          datasets: [
            {
              data: locPercentages,
              backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                '#9966FF', '#FF9F40', '#C9CBCF', '#455A64'
              ],
            }
          ]
        };
      },
      error: (err) => {
        console.error('Σφάλμα κατά τη φόρτωση των στατιστικών:', err);
      }
    });
  }


}
