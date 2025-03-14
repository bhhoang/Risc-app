// src/app/components/json-quiz/json-quiz.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Quiz, QuizQuestion } from '../../models/quiz.models';
import { QuizJsonService } from '../../services/quiz-json.service';
import { AuthService } from '../../services/auth.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-json-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './json-quiz.component.html',
  styleUrls: ['./json-quiz.component.css']
})
export class JsonQuizComponent implements OnInit {
  // Available quizzes
  allQuizzes: Quiz[] = [];
  selectedQuiz: Quiz | null = null;
  
  // Quiz state
  currentQuestionIndex: number = 0;
  userAnswers: string[] = [];
  selectedOption: string = '';
  quizStarted: boolean = false;
  quizCompleted: boolean = false;
  
  // Results
  score: number = 0;
  feedback: string = '';
  formattedFeedback: SafeHtml = '';
  
  // UI state
  loading: boolean = true;
  error: string = '';

  constructor(
    private quizJsonService: QuizJsonService,
    public authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    this.loading = true;
    this.quizJsonService.getQuizzes().subscribe(
      (quizzes) => {
        this.allQuizzes = quizzes;
        this.loading = false;
        
        if (this.allQuizzes.length > 0) {
          // Pre-select the first quiz
          this.selectedQuiz = this.allQuizzes[0];
        }
      },
      (error) => {
        console.error('Error loading quizzes:', error);
        this.error = 'Une erreur est survenue lors du chargement des quiz.';
        this.loading = false;
      }
    );
  }

  startQuiz(): void {
    if (!this.selectedQuiz) return;
    
    this.quizStarted = true;
    this.quizCompleted = false;
    this.currentQuestionIndex = 0;
    this.userAnswers = new Array(this.selectedQuiz.questions.length).fill('');
    this.score = 0;
    this.feedback = '';
    this.formattedFeedback = '';
    this.selectedOption = '';
  }

  getCurrentQuestion(): QuizQuestion | null {
    if (!this.selectedQuiz || this.currentQuestionIndex >= this.selectedQuiz.questions.length) {
      return null;
    }
    return this.selectedQuiz.questions[this.currentQuestionIndex];
  }

  selectAnswer(option: string): void {
    this.selectedOption = option;
    this.userAnswers[this.currentQuestionIndex] = option;
  }

  nextQuestion(): void {
    if (!this.selectedQuiz) return;
    
    // Save current answer if selected
    if (this.selectedOption) {
      this.userAnswers[this.currentQuestionIndex] = this.selectedOption;
    }
    
    if (this.currentQuestionIndex < this.selectedQuiz.questions.length - 1) {
      this.currentQuestionIndex++;
      this.selectedOption = this.userAnswers[this.currentQuestionIndex] || '';
    } else {
      this.completeQuiz();
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.selectedOption = this.userAnswers[this.currentQuestionIndex] || '';
    }
  }

  completeQuiz(): void {
    if (!this.selectedQuiz) return;
    
    // Calculate score
    let correctAnswers = 0;
    this.selectedQuiz.questions.forEach((question, index) => {
      if (this.userAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    this.score = Math.round((correctAnswers / this.selectedQuiz.questions.length) * 100);
    
    // Generate feedback
    this.generateFeedback();
    
    this.quizCompleted = true;
  }

  generateFeedback(): void {
    if (!this.selectedQuiz) return;
    
    let feedbackHtml = '<div class="feedback-summary">';
    
    // Add score summary
    feedbackHtml += `<h3>Score: ${this.score}%</h3>`;
    
    // Add per-question feedback
    feedbackHtml += '<div class="question-feedback">';
    this.selectedQuiz.questions.forEach((question, index) => {
      const userAnswer = this.userAnswers[index] || "Pas de réponse";
      const isCorrect = userAnswer === question.correctAnswer;
      
      feedbackHtml += `<div class="question-item ${isCorrect ? 'correct' : 'incorrect'}">`;
      feedbackHtml += `<p class="question-text"><strong>Question ${index + 1}:</strong> ${question.question}</p>`;
      feedbackHtml += `<p class="user-answer"><strong>Votre réponse:</strong> ${userAnswer}</p>`;
      
      if (!isCorrect) {
        feedbackHtml += `<p class="correct-answer"><strong>Réponse correcte:</strong> ${question.correctAnswer}</p>`;
      }
      
      feedbackHtml += `<p class="explanation"><strong>Explication:</strong> ${question.explanation}</p>`;
      feedbackHtml += '</div>';
    });
    feedbackHtml += '</div></div>';
    
    this.feedback = feedbackHtml;
    this.formattedFeedback = this.sanitizer.bypassSecurityTrustHtml(feedbackHtml);
  }

  resetQuiz(): void {
    this.quizStarted = false;
    this.quizCompleted = false;
    this.selectedOption = '';
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
  }

  selectQuiz(quiz: Quiz): void {
    this.selectedQuiz = quiz;
    this.resetQuiz();
  }

  getProgressPercentage(): number {
    if (!this.selectedQuiz) return 0;
    return ((this.currentQuestionIndex + 1) / this.selectedQuiz.questions.length) * 100;
  }
}