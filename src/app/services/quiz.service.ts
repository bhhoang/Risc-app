import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private apiUrl = 'http://localhost:3000/api/quiz'; 

  constructor(private http: HttpClient) {}

  generateQuiz(niveau: string, matiere: string, sous_sujet: string, nombre_questions: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, { niveau, matiere, sous_sujet, nombre_questions });
  }
  
  generateFeedback(questions: string[], answers: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/quiz/feedback`, { questions, answers });
  }
  addQuizToHistory(quiz: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/history`, quiz);
  }

  getQuizHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/history`);
  }

}