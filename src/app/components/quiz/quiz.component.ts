import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizComponent implements OnInit {
  // Quiz configuration
  niveau: string = 'CP';
  matiere: string = 'Maths';
  sous_sujet: string = '';
  nombre_questions: number = 5;
  
  // Quiz state
  questions: string[] = [];
  answers: string[] = [];
  feedback: string = '';
  formattedFeedback: SafeHtml = '';
  quizStarted: boolean = false;
  quizSubmitted: boolean = false;
  currentQuestionIndex: number = 0;
  loading: boolean = false;
  
  // Subject mapping
  availableTopics: string[] = [];
  
  topicsBySubject: { [key: string]: { [key: string]: string[] } } = {
    'Maths': {
      'CP': ["Nombres jusqu'à 10", "Addition simple", "Formes géométriques de base", "Comparaison de quantités"],
      'CE1': ["Nombres jusqu'à 100", "Addition et soustraction", "Unités de mesure", "Repérage dans l'espace"],
      'CE2': ["Nombres jusqu'à 1000", "Multiplication", "Géométrie plane", "Mesures de longueur"],
      'CM1': ["Nombres jusqu'au million", "Division", "Fractions simples", "Géométrie dans l'espace"],
      'CM2': ["Nombres décimaux", "Proportionnalité", "Fractions et pourcentages", "Aires et périmètres"]
    },
    'Français': {
      'CP': ["Alphabet et sons", "Lecture de mots simples", "Écriture de lettres", "Vocabulaire de base"],
      'CE1': ["Lecture de phrases", "Grammaire simple", "Écriture de mots", "Vocabulaire thématique"],
      'CE2': ["Compréhension de textes", "Nature des mots", "Conjugaison présent", "Production d'écrits"],
      'CM1': ["Lecture expressive", "Conjugaison des temps simples", "Accords grammaticaux", "Rédaction"],
      'CM2': ["Littérature", "Conjugaison des temps composés", "Figures de style", "Expression écrite"]
    },
    'Histoire': {
      'CP': ["Temps qui passe", "Journée et semaine", "Générations", "Événements personnels"],
      'CE1': ["Calendrier", "Arbre généalogique", "Évolution des modes de vie", "Histoire locale"],
      'CE2': ["Préhistoire", "Antiquité", "Moyen Âge", "Temps modernes"],
      'CM1': ["Gaule romaine", "Moyen Âge approfondi", "Renaissance", "Temps des rois"],
      'CM2': ["Révolution française", "XIXe siècle", "Guerres mondiales", "Europe et construction européenne"]
    },
    'Sciences': {
      'CP': ["Les saisons", "Les cinq sens", "Les animaux", "Les matériaux"],
      'CE1': ["Cycle de vie", "États de la matière", "Objets techniques", "Hygiène et santé"],
      'CE2': ["Développement des végétaux", "Classification animale", "Nutrition", "Électricité simple"],
      'CM1': ["Système solaire", "Matière et énergie", "Le corps humain", "Développement durable"],
      'CM2': ["Reproduction", "Adaptations des êtres vivants", "Technologie", "Environnement et écologie"]
    }
  };

  constructor(
    private quizService: QuizService,
    public authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.updateSubjects();
  }

  updateSubjects(): void {
    if (this.topicsBySubject[this.matiere] && this.topicsBySubject[this.matiere][this.niveau]) {
      this.availableTopics = this.topicsBySubject[this.matiere][this.niveau];
      this.sous_sujet = this.availableTopics[0];
    } else {
      this.availableTopics = [];
      this.sous_sujet = '';
    }
  }

  generateQuiz(): void {
    this.loading = true;
    this.quizService.generateQuiz(this.niveau, this.matiere, this.sous_sujet, this.nombre_questions)
      .subscribe(
        (response) => {
          this.questions = response.questions;
          this.answers = new Array(this.questions.length).fill('');
          this.quizStarted = true;
          this.currentQuestionIndex = 0;
          this.loading = false;
        },
        (error) => {
          console.error('Erreur lors de la génération du quiz', error);
          this.loading = false;
          // Show user-friendly error message
        }
      );
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  submitAnswers(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    // Generate feedback
    this.quizService.generateFeedback(this.questions, this.answers)
      .subscribe(
        (response) => {
          this.feedback = response.feedback;
          // Format feedback with colors and styles
          this.formattedFeedback = this.sanitizer.bypassSecurityTrustHtml(
            this.formatFeedback(this.feedback)
          );
          this.quizSubmitted = true;
          this.loading = false;
          
          // Save quiz history
          const utilisateur = this.authService.getCurrentUser();
          if (utilisateur && utilisateur._id) {
            this.quizService.addQuizToHistory({
              utilisateur_id: utilisateur._id,
              niveau: this.niveau,
              matiere: this.matiere,
              sous_sujet: this.sous_sujet,
              questions: this.questions,
              answers: this.answers,
              feedback: this.feedback,
              date: new Date()
            }).subscribe();
          }
        },
        (error) => {
          console.error('Erreur lors de la génération du feedback :', error);
          this.loading = false;
        }
      );
  }
  
  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (!user || !user.nom) return '?';
    
    const nameParts = user.nom.split(' ');
    if (nameParts.length > 1) {
      // Return first character of first and last name
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    } else {
      // If only one name, return first two characters
      return user.nom.substring(0, 2).toUpperCase();
    }
  }

  resetQuiz(): void {
    this.quizStarted = false;
    this.quizSubmitted = false;
    this.questions = [];
    this.answers = [];
    this.feedback = '';
    this.formattedFeedback = '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Helper function to format feedback with colors
  private formatFeedback(feedback: string): string {
    if (!feedback) return '';
    
    // Replace line breaks with proper HTML
    let formatted = feedback.replace(/\n/g, '<br>');
    
    // Highlight correct and incorrect answers
    formatted = formatted.replace(/correcte/gi, '<span style="color: #4caf50; font-weight: bold;">correcte</span>');
    formatted = formatted.replace(/incorrect/gi, '<span style="color: #f44336; font-weight: bold;">incorrect</span>');
    
    // Highlight key terms
    formatted = formatted.replace(/Félicitations/gi, '<span style="color: #4a6bff; font-weight: bold;">Félicitations</span>');
    formatted = formatted.replace(/Attention/gi, '<span style="color: #ff9800; font-weight: bold;">Attention</span>');
    
    return formatted;
  }
}