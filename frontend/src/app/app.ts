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
  userRole: string | null = null;

  constructor(private router: Router, private http: HttpClient) {
    this.checkAuth();
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      this.checkAuth();
    });
  }

  checkAuth(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.isLogged = false;
      this.userRole = null;
      return;
    }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any>('/api/me', { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && res.user) {
          try {
            localStorage.setItem('userName', res.user.name || '');
            localStorage.setItem('userEmail', res.user.email || '');
          } catch (e) {
            console.warn('Failed to write to localStorage', e);
          }
          this.isLogged = true;
          this.userRole = res.user.role || null;
        } else {
          this.isLogged = false;
          this.userRole = null;
        }
      },
      error: () => {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          localStorage.removeItem('userEmail');
        } catch (e) {}
        this.isLogged = false;
        this.userRole = null;
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
    this.userRole = null;
    this.router.navigate(['/']);
  }
}
