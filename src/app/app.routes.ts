import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { QuizComponent } from './components/quiz/quiz.component';
import { QuizHistoryComponent } from './components/quiz-history/quiz-history.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'quiz', component: QuizComponent },
  { 
    path: 'history', 
    component: QuizHistoryComponent, 
    canActivate: [authGuard] 
  },
  { path: '', redirectTo: '/quiz', pathMatch: 'full' }
];