import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  mot_de_passe: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';

  constructor(public authService: AuthService, private router: Router) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/quiz']);
    }
  }

  onSubmit(): void {
    if (!this.email || !this.mot_de_passe) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ 
      email: this.email, 
      mot_de_passe: this.mot_de_passe,
      remember: this.rememberMe
    }).subscribe(
      (response) => {
        this.loading = false;
        this.router.navigate(['/quiz']);
      },
      (error) => {
        this.loading = false;
        console.error('Erreur de connexion', error);
        
        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Email ou mot de passe incorrect.';
        } else {
          this.errorMessage = 'Une erreur s\'est produite lors de la connexion. Veuillez réessayer plus tard.';
        }
      }
    );
  }
}