import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http'; 
import { ChartConfiguration, ChartData, ChartType } from 'chart.js'; 
import { BaseChartDirective } from 'ng2-charts'; 
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

//  ανοιχτά στατιστικά
  showStatistics = false;

  // δεδομενα για την πίτα
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right' 
      },
        tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed; // Το νούμερο/ποσοστό
            return ` ${label}: ${value}%`; 
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

 
  constructor(private http: HttpClient) {}
  //  συνάρτηση που ανοιγοκλείνει τα στατιστικά και καλεί το Flask
  toggleStatistics() {
    this.showStatistics = !this.showStatistics;
    
    // Αν ο χρήστης τα άνοιξε, τρέξε το request στο backend live
    if (this.showStatistics) {
      this.loadSearchStatistics();
    }
  }

  // συνάρτηση που φέρνει τα δεδομένα από το Flask
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
