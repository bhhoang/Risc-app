// Replace your quiz-details.component.ts with this improved version

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-quiz-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: white;">
      <h1 style="color: #4361ee; margin-bottom: 20px;">Détails du Quiz</h1>
      
      <!-- Loading indicator -->
      <div *ngIf="loading" style="text-align: center; padding: 20px;">
        <p>Chargement en cours...</p>
      </div>
      
      <!-- Error message -->
      <div *ngIf="error" style="background-color: #ffeeee; color: #ff0000; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p>{{ error }}</p>
        <button (click)="loadQuizDetails()" style="padding: 5px 10px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 3px;">Réessayer</button>
      </div>
      
      <!-- Quiz content -->
      <div *ngIf="quiz && !loading && !error">
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #333;">{{ quiz.matiere }} - {{ quiz.sous_sujet }}</h2>
          <p><strong>Niveau:</strong> {{ quiz.niveau }}</p>
          <p><strong>Date:</strong> {{ quiz.date_creation | date:'dd/MM/yyyy HH:mm' }}</p>
          <p><strong>Score:</strong> {{ quiz.score }}%</p>
        </div>
        
        <h3 style="margin-top: 30px; color: #333;">Questions et Réponses</h3>
        <div *ngFor="let question of formattedQuestions; let i = index" 
             style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
          <p style="font-weight: bold;">{{ question }}</p>
          <p><strong>Réponse:</strong> {{ quiz.reponses[i] || 'Non répondu' }}</p>
        </div>
        
        <div *ngIf="sanitizedFeedback">
          <h3 style="margin-top: 30px; color: #333;">Feedback</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;" [innerHTML]="sanitizedFeedback"></div>
        </div>
        
        <div *ngIf="quiz.lacunes && quiz.lacunes.length > 0">
          <h3 style="margin-top: 30px; color: #333;">Points à améliorer</h3>
          <ul style="padding-left: 20px;">
            <li *ngFor="let lacune of quiz.lacunes" style="margin-bottom: 8px;">
              {{ lacune }}
            </li>
          </ul>
        </div>
        
        <div style="margin-top: 30px;">
          <button (click)="goBack()" style="padding: 10px 15px; background-color: #4361ee; color: white; border: none; border-radius: 5px; margin-right: 10px; cursor: pointer;">Retour</button>
          <button (click)="retakeQuiz()" style="padding: 10px 15px; background-color: #22c55e; color: white; border: none; border-radius: 5px; cursor: pointer;">Nouveau quiz similaire</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Some basic styling to ensure visibility */
    :host {
      display: block;
      width: 100%;
      background-color: #f7f9fc;
    }
    
    /* Style feedback content */
    ::ng-deep .feedback-content p, ::ng-deep .feedback-content li {
      margin-bottom: 10px;
    }
    
    ::ng-deep strong, ::ng-deep b {
      font-weight: bold;
    }
  `]
})
export class QuizDetailsComponent implements OnInit {
  quizId: string = '';
  quiz: any = null;
  sanitizedFeedback: SafeHtml = '';
  formattedQuestions: string[] = [];
  loading: boolean = true;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService,
    public authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    console.log('QuizDetailsComponent initialized');
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log('Route param id:', id);
      
      if (id) {
        this.quizId = id;
        this.loadQuizDetails();
      } else {
        this.error = 'ID de quiz non fourni';
        this.loading = false;
        console.error('No quiz ID provided in route');
      }
    });
  }

  loadQuizDetails(): void {
    this.loading = true;
    this.error = '';
    console.log('Loading quiz details for ID:', this.quizId);
    
    this.quizService.getQuizDetails(this.quizId).subscribe({
      next: (response) => {
        console.log('Quiz details loaded successfully:', response);
        this.quiz = response.quiz;
        
        // Format the questions to remove parenthetical content
        this.formatQuestions();
        
        // Sanitize the feedback HTML
        if (this.quiz && this.quiz.feedback) {
          // Remove the <think> section if present
          let feedback = this.quiz.feedback;
          if (feedback.includes('<think>') && feedback.includes('</think>')) {
            feedback = feedback.replace(/<think>[\s\S]*?<\/think>/g, '');
          }
          this.sanitizedFeedback = this.sanitizer.bypassSecurityTrustHtml(feedback);
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading quiz details:', error);
        this.error = 'Erreur lors du chargement des détails du quiz: ' + 
          (error.error?.message || error.message || 'Erreur inconnue');
        this.loading = false;
      }
    });
  }

  formatQuestions(): void {
    if (!this.quiz || !this.quiz.questions) return;
    
    this.formattedQuestions = this.quiz.questions.map((question: string) => {
      // Remove everything inside parentheses and any "This question..." explanations
      return question.replace(/\([^)]*\)/g, '')
                    .replace(/This question[^.]*./, '')
                    .trim();
    });
  }

  goBack(): void {
    this.router.navigate(['/history']);
  }

  retakeQuiz(): void {
    if (this.quiz) {
      this.router.navigate(['/quiz'], { 
        queryParams: { 
          matiere: this.quiz.matiere, 
          sous_sujet: this.quiz.sous_sujet,
          niveau: this.quiz.niveau
        } 
      });
    }
  }
}