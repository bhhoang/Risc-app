import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'; 
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth'; // URL d'API

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object 
  ) {}

  register(user: { nom: string, email: string, mot_de_passe: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  login(credentials: { email: string, mot_de_passe: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) { // Vérifiez si on est dans un navigateur
      localStorage.removeItem('currentUser');
    }
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId)) { 
      return !!localStorage.getItem('currentUser');
    }
    return false; // Retourne false côté serveur
  }

  getCurrentUser(): any {
    if (isPlatformBrowser(this.platformId)) {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    }
    return {}; // Retourne un objet vide côté serveur
  }
}