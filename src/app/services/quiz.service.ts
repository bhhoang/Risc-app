import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { catchError, map } from 'rxjs/operators';

export interface QuizConfig {
  niveau: string;
  matiere: string;
  sous_sujet: string;
  nombre_questions: number;
}

export interface QuizHistory {
  _id: string;
  utilisateur_id: string;
  niveau: string;
  matiere: string;
  sous_sujet: string;
  questions: string[];
  reponses: string[];
  feedback?: string;
  score: number;
  lacunes: string[];
  date_creation: Date;
}

export interface QuizRecommendation {
  titre: string;
  description: string;
  difficulte: string;
  matiere: string;
  sous_sujet: string;
}

export interface QuizStatistics {
  totalQuiz: number;
  scoresMoyens: { [key: string]: number };
  matieresFavorites: string[];
  progression: { [key: string]: { scoreMoyen: number, nombreQuiz: number } };
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private apiUrl = 'http://localhost:3000/api/quiz';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Générer un nouveau quiz
  generateQuiz(niveau: string, matiere: string, sous_sujet: string, nombre_questions: number): Observable<{ questions: string[] }> {
    const headers = this.authService.getAuthHeaders();
    
    return this.http.post<{ questions: string[] }>(
      `${this.apiUrl}/generate`, 
      { niveau, matiere, sous_sujet, nombre_questions },
      { headers }
    );
  }
  
  // Générer un feedback sur les réponses
  generateFeedback(questions: string[], reponses: string[]): Observable<{ feedback: string }> {
    const headers = this.authService.getAuthHeaders();
    
    return this.http.post<{ feedback: string }>(
      `${this.apiUrl}/feedback`, 
      { questions, reponses_utilisateur: reponses },
      { headers }
    );
  }
  
  // Enregistrer un quiz dans l'historique
  addQuizToHistory(quiz: {
    niveau: string;
    matiere: string;
    sous_sujet: string;
    utilisateur_id: string;
    questions: string[];
    answers: string[];
    feedback?: string;
    date?: Date;
  }): Observable<{ quizId: string }> {
    const headers = this.authService.getAuthHeaders();
    
    return this.http.post<{ message: string, quizId: string }>(
      `${this.apiUrl}/history`, 
      {
        niveau: quiz.niveau,
        matiere: quiz.matiere,
        sous_sujet: quiz.sous_sujet,
        questions: quiz.questions,
        reponses: quiz.answers,
        feedback: quiz.feedback,
        date_creation: quiz.date || new Date()
      },
      { headers }
    );
  }

  // Récupérer l'historique des quiz
  getQuizHistory(options: {
    page?: number;
    limit?: number;
    matiere?: string;
    niveau?: string;
    depuis?: Date;
  } = {}): Observable<{
    quizHistory: QuizHistory[];
    pagination: {
      totalQuiz: number;
      totalPages: number;
      currentPage: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
    stats: QuizStatistics;
  }> {
    const headers = this.authService.getAuthHeaders();
    
    // Construire les paramètres de requête
    let queryParams = '';
    if (options.page) queryParams += `page=${options.page}&`;
    if (options.limit) queryParams += `limit=${options.limit}&`;
    if (options.matiere) queryParams += `matiere=${options.matiere}&`;
    if (options.niveau) queryParams += `niveau=${options.niveau}&`;
    if (options.depuis) queryParams += `depuis=${options.depuis.toISOString()}&`;
    
    // Ajouter le ? si des paramètres existent
    queryParams = queryParams ? `?${queryParams.slice(0, -1)}` : '';
    
    return this.http.get<{
      quizHistory: QuizHistory[];
      pagination: any;
      stats: QuizStatistics;
    }>(`${this.apiUrl}/history${queryParams}`, { headers })
    .pipe(
      map(response => {
        // Formater les dates
        response.quizHistory.forEach(quiz => {
          quiz.date_creation = new Date(quiz.date_creation);
        });
        return response;
      })
    );
  }

  // Récupérer les détails d'un quiz spécifique
  getQuizDetails(quizId: string): Observable<{ quiz: QuizHistory }> {
    const headers = this.authService.getAuthHeaders();
    
    return this.http.get<{ quiz: QuizHistory }>(
      `${this.apiUrl}/history/${quizId}`,
      { headers }
    ).pipe(
      map(response => {
        // Formater la date
        response.quiz.date_creation = new Date(response.quiz.date_creation);
        return response;
      })
    );
  }

  // Obtenir des recommandations personnalisées
  getRecommendations(): Observable<{
    recommendations: {
      lacunesIdentifiees: string[];
      sujetsAtravailler: { matiere: string; sous_sujet: string; scoreMoyen: number }[];
      quizSuggeres: QuizRecommendation[];
    }
  }> {
    const headers = this.authService.getAuthHeaders();
    
    return this.http.get<{
      recommendations: {
        lacunesIdentifiees: string[];
        sujetsAtravailler: { matiere: string; sous_sujet: string; scoreMoyen: number }[];
        quizSuggeres: QuizRecommendation[];
      }
    }>(`${this.apiUrl}/recommendations`, { headers });
  }
}