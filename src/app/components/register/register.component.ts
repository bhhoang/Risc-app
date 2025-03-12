import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  nom: string = '';
  email: string = '';
  mot_de_passe: string = '';
  confirmPassword: string = '';
  niveau: string = 'CP'; // Default level
  acceptTerms: boolean = false;
  showPassword: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';

  constructor(public authService: AuthService, private router: Router) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/quiz']);
    }
  }

  get passwordMismatch(): boolean {
    return this.mot_de_passe !== this.confirmPassword && this.confirmPassword !== '';
  }

  onSubmit(): void {
    if (this.passwordMismatch || !this.acceptTerms) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.register({
      nom: this.nom,
      email: this.email,
      mot_de_passe: this.mot_de_passe,
      niveau_scolaire: this.niveau
    }).subscribe(
      (response) => {
        this.loading = false;
        this.router.navigate(['/quiz']);
      },
      (error) => {
        this.loading = false;
        console.error('Erreur d\'inscription', error);
        
        if (error.status === 400) {
          if (error.error?.message?.includes('email')) {
            this.errorMessage = 'Cet email est déjà utilisé. Essaie avec une autre adresse.';
          } else {
            this.errorMessage = error.error?.message || 'Une erreur s\'est produite lors de l\'inscription.';
          }
        } else {
          this.errorMessage = 'Une erreur s\'est produite. Vérifie ta connexion et réessaie.';
        }
      }
    );
  }
}