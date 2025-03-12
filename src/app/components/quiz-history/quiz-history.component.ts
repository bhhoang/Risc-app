import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { QuizService, QuizHistory, QuizRecommendation, QuizStatistics } from '../../services/quiz.service';
import { AuthService } from '../../services/auth.service';

interface ProgressionData {
  month: string;
  score: number;
  count: number;
}

@Component({
  selector: 'app-quiz-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './quiz-history.component.html',
  styleUrls: ['./quiz-history.component.css']
})
export class QuizHistoryComponent implements OnInit {
  // Check if we're in a browser
  isBrowser: boolean;
  
  // Quiz history data
  quizHistory: QuizHistory[] = [];
  pagination: {
    totalQuiz: number;
    totalPages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  } | null = null;
  
  // Statistics
  quizStats: QuizStatistics = {
    totalQuiz: 0,
    scoresMoyens: {},
    matieresFavorites: [],
    progression: {}
  };
  averageScore: number | null = null;
  progressionData: ProgressionData[] = [];
  
  // Recommendations
  recommendations: {
    lacunesIdentifiees: string[];
    sujetsAtravailler: { matiere: string; sous_sujet: string; scoreMoyen: number }[];
    quizSuggeres: QuizRecommendation[];
  } = {
    lacunesIdentifiees: [],
    sujetsAtravailler: [],
    quizSuggeres: []
  };
  
  // Filters
  filterMatiere: string = '';
  filterNiveau: string = '';
  
  // UI state
  loading: boolean = false;
  error: string = '';

  constructor(
    private quizService: QuizService,
    public authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Skip loading data during server-side rendering
    if (!this.isBrowser) {
      return;
    }
    
    if (!this.authService.isLoggedIn()) {
      return;
    }
    
    this.loadQuizHistory();
    this.loadRecommendations();
  }

  loadQuizHistory(page: number = 1): void {
    // Skip if not in browser
    if (!this.isBrowser) {
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    const options: any = {
      page: page,
      limit: 10
    };
    
    if (this.filterMatiere) options.matiere = this.filterMatiere;
    if (this.filterNiveau) options.niveau = this.filterNiveau;
    
    this.quizService.getQuizHistory(options).subscribe(
      (response) => {
        this.quizHistory = response.quizHistory || [];
        this.pagination = response.pagination;
        
        // Update stats with response data
        if (response.stats) {
          this.quizStats.totalQuiz = response.stats.totalQuiz || 0;
          this.quizStats.scoresMoyens = response.stats.scoresMoyens || {};
          this.quizStats.matieresFavorites = response.stats.matieresFavorites || [];
          this.quizStats.progression = response.stats.progression || {};
        }
        
        this.calculateAverageScore();
        this.processProgressionData();
        this.loading = false;
      },
      (error) => {
        console.error('Erreur lors du chargement de l\'historique des quiz', error);
        this.error = 'Impossible de charger votre historique. Veuillez réessayer plus tard.';
        this.loading = false;
      }
    );
  }

  loadRecommendations(): void {
    // Skip if not in browser
    if (!this.isBrowser) {
      return;
    }
    
    if (!this.authService.isLoggedIn()) {
      return;
    }
    
    this.quizService.getRecommendations().subscribe(
      (response) => {
        if (response.recommendations) {
          this.recommendations.lacunesIdentifiees = response.recommendations.lacunesIdentifiees || [];
          this.recommendations.sujetsAtravailler = response.recommendations.sujetsAtravailler || [];
          this.recommendations.quizSuggeres = response.recommendations.quizSuggeres || [];
        }
      },
      (error) => {
        console.error('Erreur lors du chargement des recommandations', error);
      }
    );
  }

  calculateAverageScore(): void {
    if (!this.quizStats || !this.quizStats.scoresMoyens) {
      this.averageScore = null;
      return;
    }
    
    const scores = Object.values(this.quizStats.scoresMoyens);
    if (scores.length === 0) {
      this.averageScore = null;
      return;
    }
    
    this.averageScore = Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    );
  }

  processProgressionData(): void {
    if (!this.quizStats || !this.quizStats.progression) {
      this.progressionData = [];
      return;
    }
    
    // Convert the progression object to array for display
    this.progressionData = Object.entries(this.quizStats.progression)
      .map(([dateKey, data]) => {
        const [year, month] = dateKey.split('-');
        
        // Use a safer way to get month names without relying on browser APIs directly
        const monthIndex = parseInt(month) - 1;
        const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jui', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
        const monthName = monthNames[monthIndex];
        
        return {
          month: monthName,
          score: data.scoreMoyen,
          count: data.nombreQuiz
        };
      })
      .sort((a, b) => {
        // Sort months chronologically
        const monthIndexA = ['jan', 'fév', 'mar', 'avr', 'mai', 'jui', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
          .indexOf(a.month.toLowerCase());
        const monthIndexB = ['jan', 'fév', 'mar', 'avr', 'mai', 'jui', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
          .indexOf(b.month.toLowerCase());
        return monthIndexA - monthIndexB;
      })
      .slice(-6); // Limit to the last 6 months
  }

  applyFilters(): void {
    this.loadQuizHistory(1); // Go back to the first page when applying filters
  }

  changePage(page: number): void {
    if (page < 1 || (this.pagination && page > this.pagination.totalPages)) {
      return;
    }
    
    this.loadQuizHistory(page);
  }

  viewQuizDetails(quizId: string): void {
    // Navigate to a details page or show a modal
    this.router.navigate(['/quiz-details', quizId]);
  }

  startRecommendedQuiz(quiz: QuizRecommendation): void {
    // Navigate to the quiz page with pre-filled parameters
    this.router.navigate(['/quiz'], { 
      queryParams: { 
        matiere: quiz.matiere,
        sous_sujet: quiz.sous_sujet,
        niveau: this.authService.getCurrentUser()?.niveau_scolaire || 'CP'
      } 
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}