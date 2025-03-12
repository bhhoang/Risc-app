import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }
    
    this.loadQuizHistory();
    this.loadRecommendations();
  }

  loadQuizHistory(page: number = 1): void {
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
        this.quizHistory = response.quizHistory;
        this.pagination = response.pagination;
        this.quizStats = response.stats;
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
    if (!this.authService.isLoggedIn()) {
      return;
    }
    
    this.quizService.getRecommendations().subscribe(
      (response) => {
        this.recommendations = response.recommendations;
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
    
    // Convertir l'objet de progression en tableau pour l'affichage
    this.progressionData = Object.entries(this.quizStats.progression)
      .map(([dateKey, data]) => {
        const [year, month] = dateKey.split('-');
        // Convertir le mois numérique en nom de mois abrégé
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', { month: 'short' });
        
        return {
          month: monthName,
          score: data.scoreMoyen,
          count: data.nombreQuiz
        };
      })
      .sort((a, b) => {
        // Pour trier les mois chronologiquement
        const monthA = new Date(new Date().getFullYear(), ['jan', 'fév', 'mar', 'avr', 'mai', 'jui', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'].indexOf(a.month.toLowerCase()), 1);
        const monthB = new Date(new Date().getFullYear(), ['jan', 'fév', 'mar', 'avr', 'mai', 'jui', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'].indexOf(b.month.toLowerCase()), 1);
        return monthA.getTime() - monthB.getTime();
      })
      .slice(-6); // Limiter aux 6 derniers mois
  }

  applyFilters(): void {
    this.loadQuizHistory(1); // Revenir à la première page lors de l'application des filtres
  }

  changePage(page: number): void {
    if (page < 1 || (this.pagination && page > this.pagination.totalPages)) {
      return;
    }
    
    this.loadQuizHistory(page);
  }

  viewQuizDetails(quizId: string): void {
    // Naviguer vers une page de détails ou afficher un modal
    this.router.navigate(['/quiz-details', quizId]);
  }

  startRecommendedQuiz(quiz: QuizRecommendation): void {
    // Naviguer vers la page du quiz avec les paramètres préremplis
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