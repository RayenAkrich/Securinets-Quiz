import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('securinets-frontend');
  isLogged = false;

  constructor(private router: Router, private http: HttpClient) {
    // Check token validity on load
    this.checkAuth();

    // Redirect from root to /quizzes when logged in; also check auth on navigation
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((ev) => {
      const url = ev.urlAfterRedirects || ev.url;
      // re-check auth status on each navigation to keep header in sync
      this.checkAuth();
      if (this.isLogged && (url === '/' || url === '')) {
        this.router.navigate(['/quizzes']);
      }
    });
  }

  checkAuth(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.isLogged = false;
      return;
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any>('/api/me', { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && res.user) {
          // ensure local name/email are in sync with server
          try {
            localStorage.setItem('userName', res.user.name || '');
            localStorage.setItem('userEmail', res.user.email || '');
          } catch (e) {
            console.warn('Failed to write to localStorage', e);
          }
          this.isLogged = true;
        } else {
          this.isLogged = false;
        }
      },
      error: () => {
        // invalid/expired token -> clear
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userEmail');
        } catch (e) {
          /* ignore */
        }
        this.isLogged = false;
      }
    });
  }

  logout(): void {
    try {
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('token');
    } catch (e) {
      console.warn('Failed to clear localStorage during logout', e);
    }
    this.isLogged = false;
    this.router.navigate(['/']);
  }
}
