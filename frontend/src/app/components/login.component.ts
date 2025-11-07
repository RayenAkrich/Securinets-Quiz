import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-page">
      <div class="visual">
        <div class="visual-inner">
          <h1>SecuriQuiz</h1>
        </div>
      </div>

      <div class="auth-form">
        <div class="card">
          <h2>Sign In</h2>
          <p class="muted">Welcome back — please sign in to continue</p>

          <form>
            <label>Email</label>
            <input type="email" placeholder="name@example.com" />

            <label>Password</label>
            <input type="password" placeholder="••••••••" />

            <button class="btn primary" type="button">Sign In</button>
          </form>

          <p class="signup-link">Don't have an account? <a routerLink="/signup">Create account</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    :host{display:block}
    .auth-page{display:flex;min-height:78vh;background:transparent;z-index:1}
    .visual{flex:1;background:linear-gradient(180deg, rgba(73,5,154,0.06), transparent);display:flex;align-items:center;justify-content:center;position:relative}
    .visual-inner{max-width:520px;padding:3rem;text-align:center}
    .visual-inner h1{color:var(--accent);font-size:3rem;letter-spacing:1px}

    .auth-form{width:480px;padding:3rem;display:flex;align-items:center;justify-content:center}
    .card{width:100%;background:var(--card);border:1px solid var(--border);padding:2rem;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5)}
    .card h2{margin:0 0 0.25rem 0;color:#fff}
    .card .muted{color:#cfcfd1;margin-bottom:1rem}
    form{display:flex;flex-direction:column;gap:0.6rem}
    label{font-size:0.85rem;color:#d0d0d2}
    input{padding:0.7rem 0.9rem;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:#e6e6e9}
    input::placeholder{color:#9aa0a6}
    .btn{margin-top:0.8rem}
    .btn.primary{padding:10px;cursor:pointer}
    .signup-link{margin-top:1rem;color:#cfcfd1}
    .signup-link a{color:var(--accent);text-decoration:none}
    `
  ]
})
export class LoginComponent {}
