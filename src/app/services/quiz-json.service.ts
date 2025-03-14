// src/app/services/quiz-json.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Quiz } from '../models/quiz.models';

@Injectable({
  providedIn: 'root'
})
export class QuizJsonService {
  private quizData: Quiz[] = [];
  
  constructor(private http: HttpClient) {}

  loadQuizzes(): Observable<Quiz[]> {
    // Path to your JSON file - adjust if needed
    return this.http.get<Quiz[]>('assets/quizQuestions.json')
      .pipe(
        map(quizzes => {
          this.quizData = quizzes;
          return quizzes;
        }),
        catchError(error => {
          console.error('Error loading quiz data:', error);
          return of([]);
        })
      );
  }

  getQuizzes(): Observable<Quiz[]> {
    if (this.quizData.length > 0) {
      return of(this.quizData);
    } else {
      return this.loadQuizzes();
    }
  }

  getQuizById(quizId: string): Observable<Quiz | undefined> {
    if (this.quizData.length > 0) {
      const quiz = this.quizData.find(q => q.quizID === quizId);
      return of(quiz);
    } else {
      return this.loadQuizzes().pipe(
        map(quizzes => quizzes.find(q => q.quizID === quizId))
      );
    }
  }

  getQuizBySubject(subject: string): Observable<Quiz[]> {
    if (this.quizData.length > 0) {
      const quizzes = this.quizData.filter(q => q.subject === subject);
      return of(quizzes);
    } else {
      return this.loadQuizzes().pipe(
        map(quizzes => quizzes.filter(q => q.subject === subject))
      );
    }
  }

  getQuizByTopic(topic: string): Observable<Quiz[]> {
    if (this.quizData.length > 0) {
      const quizzes = this.quizData.filter(q => q.topic === topic);
      return of(quizzes);
    } else {
      return this.loadQuizzes().pipe(
        map(quizzes => quizzes.filter(q => q.topic === topic))
      );
    }
  }
}