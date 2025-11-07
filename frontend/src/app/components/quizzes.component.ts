import { Component } from '@angular/core';

@Component({
  selector: 'app-quizzes',
  standalone: true,
  template: `
    <div style="padding:2rem;max-width:900px;margin:2rem auto;color:var(--text);">
      <h1 style="color:var(--accent);margin-bottom:0.25rem">Quizzes</h1>
      <p class="muted">This is a placeholder page — quizzes will be implemented here.</p>
      <div style="margin-top:1.2rem;padding:1rem;border-radius:10px;background:var(--card);border:1px solid var(--border)">
        <p style="color:#cfcfd1;margin:0">Your account was successfully created. The quizzes UI is coming soon.</p>
      </div>
    </div>
  `,
  styles: [``]
})
export class QuizzesComponent {}
