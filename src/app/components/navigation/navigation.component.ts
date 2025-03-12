import { Component, OnInit, HostListener, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  expanded: boolean = false;
  isMobile: boolean = false;
  isBrowser: boolean = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Only run browser-specific code if we're in a browser
    if (this.isBrowser) {
      // Check if it's mobile view on init
      this.checkScreenWidth();
      
      // Default expanded to true for desktop
      this.expanded = !this.isMobile;
    } else {
      // Default values for server rendering
      this.isMobile = false;
      this.expanded = true;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    // Only run if in browser
    if (this.isBrowser) {
      this.checkScreenWidth();
    }
  }

  checkScreenWidth(): void {
    // Only run if in browser
    if (this.isBrowser) {
      this.isMobile = window.innerWidth < 768;
      
      // Collapse the menu on mobile by default
      if (this.isMobile) {
        this.expanded = false;
      }
    }
  }

  toggleNav(): void {
    this.expanded = !this.expanded;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (!user || !user.nom) return '?';
    
    const nameParts = user.nom.split(' ');
    if (nameParts.length > 1) {
      // Return first character of first and last name
      return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    } else {
      // If only one name, return first two characters
      return user.nom.substring(0, 2).toUpperCase();
    }
  }
}