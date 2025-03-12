import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  nom: string = '';
  email: string = '';
  mot_de_passe: string = '';

  constructor(public authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.authService.register({ nom: this.nom, email: this.email, mot_de_passe: this.mot_de_passe }).subscribe(
      (response) => {
        localStorage.setItem('currentUser', JSON.stringify(response));
        this.router.navigate(['/quiz']);
      },
      (error) => {
        console.error('Erreur d\'inscription', error);
      }
    );
  }
}