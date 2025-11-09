import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quizzes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quizzes-page">
      <h1>Quizzes</h1>
      <div *ngIf="quizzes.length === 0" class="muted">No quizzes available.</div>
      <div class="quiz-list">
        <div class="quiz-card" *ngFor="let q of quizzes">
          <div class="quiz-head">
            <div class="title">{{ q.title }}</div>
            <div class="meta">{{ q.question_count || 0 }} questions · {{ q.timelimit || 0 }} min</div>
          </div>
          <div class="desc">{{ q.description }}</div>
          <div class="quiz-actions">
            <button *ngIf="!q.user_taken" class="btn take" (click)="takeQuiz(q.quizID)">Take Test</button>
            <div *ngIf="q.user_taken" class="taken">
              Test already taken:
              <span [ngClass]="{'passed': q.user_passed, 'failed': !q.user_passed}">
                {{ q.user_passed ? ' Passed' : ' Failed' }}
              </span>
              <span *ngIf="q.user_score !== null"> — Score: {{ q.user_score }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quizzes-page { padding: 2rem; max-width: 900px; margin: 2rem auto; }
    h1 { color: var(--accent); margin-bottom: 0.5rem }
    .muted { color: #888 }
    .quiz-list { display:flex; flex-direction:column; gap:1rem }
    .quiz-card { padding:1rem; border-radius:8px; border:1px solid #eee; background:var(--card); }
    .quiz-head { display:flex; justify-content:space-between; align-items:center }
    .title { font-weight:600; color:var(--accent) }
    .meta { font-size:0.9rem; color:#666 }
    .desc { margin:0.6rem 0; color:#444 }
    .quiz-actions { display:flex; align-items:center; gap:0.8rem }
    .btn.take { background:#1890ff; color:#fff; border:none; padding:0.4rem 0.8rem; border-radius:6px;cursor:pointer }
    .btn.take:hover { background:#40a9ff }
    .taken { font-weight:600 }
    .passed { color: #237804; margin-left:0.4rem }
    .failed { color: #a8071a; margin-left:0.4rem }
  `]
})
export class QuizzesComponent implements OnInit {
  quizzes: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes(): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.get<any>('/api/quizzes', { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && Array.isArray(res.quizzes)) {
          // normalize fields
          this.quizzes = res.quizzes.map((q: any) => ({
            quizID: q.quizID,
            title: q.title,
            description: q.description,
            timelimit: q.timelimit,
            question_count: q.question_count,
            user_taken: !!q.user_taken,
            user_passed: !!q.user_passed,
            user_score: q.user_score ?? null
          }));
        }
      },
      error: (err) => {
        console.warn('Failed to load quizzes', err);
      }
    });
  }

  takeQuiz(quizID: number): void {
    // navigate to take-quiz route (implement separately)
    this.router.navigate([`/take-quiz/${quizID}`]);
  }
}
