import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="auth-page">
      <div class="visual">
        <div class="visual-inner">
          <h1>SecuriQuiz</h1>
        </div>
      </div>

      <div class="auth-form">
        <div class="card">
          <h2 *ngIf="step==='form'">Create Account</h2>
          <h2 *ngIf="step==='verify'">Verify Email</h2>
          <p class="muted" *ngIf="step==='form'">Choose your account type and start your journey with us</p>

          <!-- Signup form -->
          <form *ngIf="step==='form'" (ngSubmit)="submitSignup()">
            <label>Full Name</label>
            <input [(ngModel)]="fullName" name="fullName" type="text" placeholder="Name" />

            <label>Email</label>
            <input [(ngModel)]="email" name="email" type="email" placeholder="name@example.com" />

            <label>Password</label>
            <input [(ngModel)]="password" name="password" type="password" placeholder="••••••••" />

            <button class="btn primary" type="submit" [disabled]="loading">{{ loading ? 'Sending…' : 'Sign Up' }}</button>
          </form>
          <p *ngIf="step==='form' && message" style="margin-top:.6rem;color:#f0b">{{ message }}</p>

          <!-- Verification step -->
          <div *ngIf="step==='verify'">
            <p class="muted">We sent a 5-digit code to <strong>{{ email }}</strong>. Enter it below to finish registration.</p>
            <label>Verification Code</label>
            <input [(ngModel)]="code" name="code" type="text" maxlength="6" placeholder="12345" />
            <button class="btn primary" (click)="submitVerify()" [disabled]="loading">{{ loading ? 'Verifying…' : 'Verify' }}</button>
            <p style="margin-top:.6rem;color:#f0b">{{ message }}</p>
          </div>

          <p class="signup-link" *ngIf="step==='form'">Already have an account? <a routerLink="/login">Sign In</a></p>
        </div>
      </div>
    </div>
  `,
  styles:[
    `
    :host{display:block}
    .auth-page{display:flex;min-height:78vh;background:transparent;z-index:1}
    .visual{flex:1;background:linear-gradient(180deg, rgba(73,5,154,0.06), transparent);display:flex;align-items:center;justify-content:center;position:relative}
    .visual-inner{max-width:520px;padding:3rem;text-align:center}
    .visual-inner h1{color:var(--accent);font-size:3rem;letter-spacing:1px}

    .auth-form{width:520px;padding:3rem;display:flex;align-items:center;justify-content:center}
    .card{width:100%;background:var(--card);border:1px solid var(--border);padding:2rem;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5)}
    .card h2{margin:0 0 0.25rem 0;color:#fff}
    .card .muted{color:#cfcfd1;margin-bottom:1rem}
    form{display:flex;flex-direction:column;gap:0.6rem}
    .row{display:flex;gap:0.6rem}
    .col{flex:1}
    label{font-size:0.85rem;color:#d0d0d2}
    input{padding:0.7rem 0.9rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#e6e6e9}
    input::placeholder{color:#9aa0a6}
    .btn{margin-top:0.8rem}
    .btn.primary{padding:10px;cursor:pointer;margin-left:10px}
    .signup-link{margin-top:1rem;color:#cfcfd1}
    .signup-link a{color:var(--accent);text-decoration:none}
    @media(max-width:800px){.row{flex-direction:column}}
    `
  ]
})
export class SignupComponent {
  fullName = '';
  email = '';
  password = '';
  code = '';
  step: 'form' | 'verify' = 'form';
  loading = false;
  message = '';

  constructor(private http: HttpClient, private router: Router) {}

  submitSignup() {
    if (!this.fullName || !this.email || !this.password) {
      this.message = 'Please fill all fields.';
      return;
    }
    this.loading = true;
    this.message = '';
    this.http.post<any>('/api/signup', { full_name: this.fullName, email: this.email, password: this.password }).subscribe({
      next: res => {
        this.loading = false;
        if (res && res.ok) {
          this.step = 'verify';
          this.message = 'Verification code sent — check your email.';
        } else {
          this.message = res?.message || 'Unexpected response from server.';
        }
      },
      error: err => {
        this.loading = false;
        if (err?.status === 409) {
          // Email already registered
          this.message = err?.error?.message || 'A user with this email already exists.';
        } else {
          this.message = err?.error?.message || 'Failed to send verification code.';
        }
      }
    });
  }

  submitVerify() {
    if (!this.code || !this.email) {
      this.message = 'Please enter the verification code.';
      return;
    }
    this.loading = true;
    this.http.post<any>('/api/verify', { email: this.email, code: this.code }).subscribe({
      next: res => {
        this.loading = false;
        if (res && res.ok) {
          // show success and redirect shortly so user sees confirmation
          this.message = 'Verification successful — redirecting to quizzes...';
          setTimeout(() => this.router.navigate(['/quizzes']), 900);
        } else {
          this.message = res?.message || 'Verification failed.';
        }
      },
      error: err => {
        this.loading = false;
        this.message = err?.error?.message || 'Verification failed.';
      }
    });
  }
}
