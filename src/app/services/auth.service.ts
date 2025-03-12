import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';

interface User {
  _id: string;
  nom: string;
  email: string;
  niveau_scolaire?: string;
  role?: string;
  token?: string;
  date_inscription?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private tokenExpirationTimer: any;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    let savedUser = null;
    
    if (this.isBrowser) {
      try {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
          savedUser = JSON.parse(userData);
          // Si le token existe, configurer son expiration
          if (savedUser && savedUser.token) {
            this.setAutoLogout(this.getTokenRemainingTime(savedUser.token));
          }
        }
      } catch (e) {
        if (this.isBrowser) {
          localStorage.removeItem('currentUser');
        }
      }
    }
    
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  // Obtenir les informations de l'utilisateur courant
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Enregistrement d'un nouvel utilisateur
  register(user: { nom: string, email: string, mot_de_passe: string, niveau_scolaire: string }): Observable<any> {
    return this.http.post<{ message: string; user: User }>(`${this.apiUrl}/register`, user)
      .pipe(
        tap(response => {
          if (response.user && response.user.token) {
            this.handleAuthentication(response.user);
          }
        }),
        catchError(error => {
          console.error('Erreur d\'inscription', error);
          return throwError(() => error);
        })
      );
  }

  // Connexion d'un utilisateur
  login(credentials: { email: string, mot_de_passe: string, remember?: boolean }): Observable<any> {
    return this.http.post<{ message: string; user: User }>(`${this.apiUrl}/login`, {
      email: credentials.email,
      mot_de_passe: credentials.mot_de_passe
    }).pipe(
      tap(response => {
        if (response.user && response.user.token) {
          this.handleAuthentication(response.user, credentials.remember);
        }
      }),
      catchError(error => {
        console.error('Erreur de connexion', error);
        return throwError(() => error);
      })
    );
  }

  // Mise à jour du profil utilisateur
  updateProfile(userData: { nom?: string, niveau_scolaire?: string }): Observable<User> {
    const headers = this.getAuthHeaders();
    
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/profile`, userData, { headers })
      .pipe(
        map(response => {
          // Mettre à jour l'utilisateur dans le stockage local
          const updatedUser = { ...this.currentUserValue, ...response.user };
          this.currentUserSubject.next(updatedUser);
          
          if (this.isBrowser) {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
          
          return updatedUser;
        }),
        catchError(error => {
          console.error('Erreur de mise à jour du profil', error);
          return throwError(() => error);
        })
      );
  }

  // Déconnexion
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('currentUser');
      
      // Effacer le timer d'expiration
      if (this.tokenExpirationTimer) {
        clearTimeout(this.tokenExpirationTimer);
        this.tokenExpirationTimer = null;
      }
    }
    
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }

  // Obtenir l'utilisateur actuel
  getCurrentUser(): User | null {
    return this.currentUserValue;
  }

  // Obtenir les en-têtes HTTP avec le token d'authentification
  getAuthHeaders(): HttpHeaders {
    const user = this.currentUserValue;
    if (user && user.token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${user.token}`
      });
    }
    return new HttpHeaders();
  }

  // Gérer la connexion automatique
  autoLogin(): void {
    if (!this.isBrowser) {
      return;
    }
    
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
      return;
    }

    try {
      const user: User = JSON.parse(userData);
      if (user && user.token) {
        const remainingTime = this.getTokenRemainingTime(user.token);
        
        if (remainingTime <= 0) {
          this.logout();
          return;
        }
        
        this.currentUserSubject.next(user);
        this.setAutoLogout(remainingTime);
      }
    } catch (e) {
      this.logout();
    }
  }

  // Configurer la déconnexion automatique
  private setAutoLogout(expirationDuration: number): void {
    if (this.isBrowser && expirationDuration > 0) {
      this.tokenExpirationTimer = setTimeout(() => {
        this.logout();
      }, expirationDuration);
    }
  }

  // Calculer le temps restant avant expiration du token (en ms)
  private getTokenRemainingTime(token: string): number {
    try {
      const jwtToken = JSON.parse(atob(token.split('.')[1]));
      const expires = new Date(jwtToken.exp * 1000);
      return expires.getTime() - Date.now();
    } catch (e) {
      return 0;
    }
  }

  // Gérer l'authentification
  private handleAuthentication(user: User, remember: boolean = false): void {
    if (this.isBrowser && user.token) {
      // Stocker les informations utilisateur
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Configurer la déconnexion automatique
      const expirationDuration = this.getTokenRemainingTime(user.token);
      this.setAutoLogout(expirationDuration);
    }
    
    this.currentUserSubject.next(user);
  }
}