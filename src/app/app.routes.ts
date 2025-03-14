// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { QuizComponent } from './components/quiz/quiz.component';
import { JsonQuizComponent } from './components/json-quiz/json-quiz.component';
import { QuizHistoryComponent } from './components/quiz-history/quiz-history.component';
import { QuizDetailsComponent } from './components/quiz-details/quiz-details.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'quiz', component: QuizComponent },
  { path: 'json-quiz', component: JsonQuizComponent },
  { 
    path: 'history', 
    component: QuizHistoryComponent, 
    canActivate: [authGuard] 
  },
  {
    path: 'quiz-details/:id',
    component: QuizDetailsComponent,
    canActivate: [authGuard]
  },
  { path: '', redirectTo: '/quiz', pathMatch: 'full' }
];