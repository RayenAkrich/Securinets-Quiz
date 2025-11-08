import { Component } from '@angular/core';

@Component({
  selector: 'app-banned',
  standalone: true,
  template: `
    <div class="banned-container">
      <h1>🚫 Banned!</h1>
      <p>
        Looks like you tried to cheat!<br>
        Cheaters never prosper... 😏<br>
        Enjoy your ban!
        SecuriQuiz[I_would_neVER_cH347_AG41N]
      </p>
    </div>
  `,
  styles: [`
    .banned-container {
      max-width: 400px;
      margin: 80px auto;
      padding: 2rem;
      background: #fff0f0;
      border: 2px solid #ff4d4f;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(255,77,79,0.1);
    }
    .banned-container h1 {
      color: #ff4d4f;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .banned-container p {
      color: #a8071a;
      font-size: 1.2rem;
    }
  `]
})
export class BannedComponent {}
