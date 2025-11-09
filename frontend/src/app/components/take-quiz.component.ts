import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface QuizSession {
  quizID: number;
  startAt: number; // epoch ms
  expiresAt?: number; // epoch ms
  answersMap: { [questionID: number]: number | null };
  currentIndex: number;
}

@Component({
  selector: 'app-take-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="loading" class="loading">Loading quiz…</div>
    <div *ngIf="!loading && !quiz">Quiz not found or cannot be loaded.</div>

    <!-- Modal backdrop -->
    <div class="modal-backdrop" *ngIf="quiz">
      <div class="modal">
        <div class="modal-header">
          <button class="nav-left" (click)="prevQuestion()">◀</button>
          <h3 class="modal-title">{{ quiz.title }}</h3>
          <button class="nav-right" (click)="nextQuestion()">▶</button>
          <div class="timer" *ngIf="hasTimer">{{ timeLeftDisplay }}</div>
          <button class="close" (click)="closeModal()">✕</button>
        </div>

        <div class="modal-body">
          <p class="muted">{{ quiz.description }}</p>

          <div class="question-topbar centered">
            <div class="question-wheel">
              <button *ngFor="let q of quiz.questions; let i = index" class="question-dot" [class.active]="i === session.currentIndex" (click)="gotoQuestion(i)">{{ i + 1 }}</button>
            </div>
          </div>

          <div class="question-area">
            <div class="q-title">{{ session.currentIndex + 1 }}. {{ currentQuestion?.title }}</div>
            <div class="q-desc" *ngIf="currentQuestion?.description">{{ currentQuestion.description }}</div>
            <div class="answers">
              <label *ngFor="let a of currentQuestion?.answers" class="answer-row">
                <input type="radio" name="q-{{currentQuestion.questionID}}" [value]="a.answerID" [(ngModel)]="session.answersMap[currentQuestion.questionID]" (change)="saveSession()" />
                <span class="answer-text">{{ a.text }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="left">
            <button class="btn" (click)="saveAndClose()">Close</button>
          </div>
          <div class="right">
            <button class="btn submit" (click)="onSubmitClick()">Submit</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Result overlay after submission -->
    <div *ngIf="submitted && result" class="result-overlay">
      <div class="result-box">
        <h2 [class.passed]="result.passed" [class.failed]="!result.passed">{{ result.passed ? 'Passed' : 'Failed' }}</h2>
        <p>Score: {{ result.score }} / {{ result.total }}</p>
        <button class="btn" (click)="finishAfterSubmit()">Back to quizzes</button>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:2000 }
    .modal { width: 760px; background:#fff; border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,0.25); overflow:hidden;color:#000; display:flex; flex-direction:column; max-height:90vh }
    .modal-header { position:relative; padding:12px 16px; display:flex; align-items:center; justify-content:center; border-bottom:1px solid #f0f0f0 }
    .modal-title { margin:0; font-size:1.1rem; font-weight:700 }
    .nav-left, .nav-right { position:absolute; top:12px; background:transparent; border:none; font-size:1.2rem; cursor:pointer }
    .nav-left { left:12px }
    .nav-right { right:48px }
    .close { position:absolute; right:12px; top:8px; background:transparent; border:none; font-size:1.1rem; cursor:pointer }
    .timer { position:absolute; right:72px; top:10px; font-weight:600; color:#fa541c }

    .modal-body { padding:16px }
    .question-topbar.centered { display:flex; justify-content:center; margin-bottom:12px }
    .question-wheel { display:flex; gap:6px; flex-wrap:wrap; justify-content:center }
    .question-dot { min-width:34px; height:34px; border-radius:6px; border:1px solid #d9d9d9; background:#f6ffed; color:#262626; font-weight:600 }
    .question-dot.active { background:#b7eb8f; border-color:#73d13d }

    .question-area { padding:8px 4px }
    .q-title { font-weight:700; margin-bottom:6px }
    .q-desc { color:#666; margin-bottom:8px }
    .answers { display:flex; flex-direction:column; gap:8px }
    .answer-row { display:flex; align-items:center; gap:0.6rem }
    .answer-text { display:inline-block }

    .modal-footer { display:flex; justify-content:space-between; padding:12px 16px; border-top:1px solid #f0f0f0 }
    .btn { border:none; padding:8px 12px; border-radius:6px; cursor:pointer }
    .btn.submit { background:#1890ff; color:#fff }

    .result-overlay { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); z-index:2100 }
    .result-box { background:#fff; padding:20px; border-radius:8px; text-align:center ;color:#000; box-shadow:0 4px 16px rgba(0,0,0,0.2) }
    .passed { color:#237804 }
    .failed { color:#a8071a }
  `]
})
export class TakeQuizComponent implements OnInit, OnDestroy {
  quiz: any = null;
  loading = false;
  session!: QuizSession;
  timerHandle: any = null;
  timeLeftDisplay = '';
  hasTimer = false;
  submitted = false;
  result: any = null;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.loadOrStartSession(id);
    window.addEventListener('beforeunload', this.beforeUnload);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnload);
    this.clearTimer();
  }

  beforeUnload = (e: BeforeUnloadEvent) => {
    this.saveSession();
  };

  loadOrStartSession(id: number): void {
    this.loading = true;
    const key = this.sessionKey(id);
    const saved = localStorage.getItem(key);
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    if (saved) {
      // restore session and fetch quiz to populate questions
      try {
        this.session = JSON.parse(saved) as QuizSession;
      } catch (e) {
        localStorage.removeItem(key);
      }
    }

    // Always call start to validate server-side (and get timelimit and questions)
    this.http.post<any>(`/api/quizzes/${id}/start`, {}, { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && res.quiz) {
          this.quiz = res.quiz;
          // initialize session if missing
          if (!this.session || this.session.quizID !== this.quiz.quizID) {
            const now = Date.now();
            const expiresAt = this.quiz.timelimit && this.quiz.timelimit > 0 ? now + this.quiz.timelimit * 60 * 1000 : undefined;
            this.session = { quizID: this.quiz.quizID, startAt: now, expiresAt, answersMap: {}, currentIndex: 0 };
            (this.quiz.questions || []).forEach((q: any) => this.session.answersMap[q.questionID] = null);
            this.saveSession();
          } else {
            // ensure answers map has all keys
            (this.quiz.questions || []).forEach((q: any) => {
              if (!(q.questionID in this.session.answersMap)) this.session.answersMap[q.questionID] = null;
            });
          }

          this.hasTimer = !!(this.session.expiresAt);
          if (this.hasTimer) this.startTimer();
        }
        this.loading = false;
      },
      error: (err) => {
        console.warn('Failed to start quiz', err);
        this.loading = false;
      }
    });
  }

  sessionKey(quizID: number): string { return `quiz_session_${quizID}`; }

  saveSession(): void {
    if (!this.session) return;
    try { localStorage.setItem(this.sessionKey(this.session.quizID), JSON.stringify(this.session)); } catch (e) { console.warn('Failed to save session', e); }
  }

  clearSession(): void {
    if (!this.session) return;
    localStorage.removeItem(this.sessionKey(this.session.quizID));
  }

  startTimer(): void {
    this.updateTimeLeft();
    this.timerHandle = setInterval(() => this.updateTimeLeft(), 1000);
  }

  clearTimer(): void {
    if (this.timerHandle) { clearInterval(this.timerHandle); this.timerHandle = null; }
  }

  updateTimeLeft(): void {
    if (!this.session || !this.session.expiresAt) return;
    const now = Date.now();
    let diff = Math.max(0, this.session.expiresAt - now);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    this.timeLeftDisplay = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    if (diff <= 0) {
      // time up -> auto-submit
      this.clearTimer();
      this.autoSubmit();
    }
  }

  get currentQuestion(): any {
    if (!this.quiz || !this.session) return null;
    return this.quiz.questions[this.session.currentIndex];
  }

  gotoQuestion(i: number): void {
    if (!this.quiz) return;
    // warn if current unanswered when moving forward
    const curQ = this.currentQuestion;
    if (curQ) {
      const selected = this.session.answersMap[curQ.questionID];
      if ((selected === null || selected === undefined) && i > this.session.currentIndex) {
        const ok = confirm('You did not answer the current question. Continue to next question?');
        if (!ok) return;
      }
    }
    this.session.currentIndex = i;
    this.saveSession();
  }

  prevQuestion(): void { if (this.session.currentIndex > 0) { this.session.currentIndex--; this.saveSession(); } }
  nextQuestion(): void { if (this.session.currentIndex < this.quiz.questions.length - 1) { this.gotoQuestion(this.session.currentIndex + 1); } }

  saveAndClose(): void { this.saveSession(); this.closeModal(); }

  closeModal(): void { /* simply hide modal by clearing quiz variable? keep data so reopen stays */ /* We'll keep modal visible as long as quiz exists. Provide back navigation instead */ this.router.navigate(['/quizzes']); }

  onSubmitClick(): void {
    // check for unanswered
    const unanswered = (this.quiz.questions || []).filter((q: any) => !this.session.answersMap[q.questionID]);
    if (unanswered.length > 0) {
      const ok = confirm(`There are ${unanswered.length} unanswered questions. Submit anyway?`);
      if (!ok) return;
    }
    this.submit();
  }

  autoSubmit(): void {
    // submit automatically using current answers (null treated as no answer)
    alert('Time is up. Submitting your answers.');
    this.submit();
  }

  submit(): void {
    if (!this.quiz) return;
    const answersPayload = (this.quiz.questions || []).map((q: any) => ({ questionID: q.questionID, answerID: this.session.answersMap[q.questionID] }));
    const payload = { answers: answersPayload };
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.post<any>(`/api/quizzes/${this.quiz.quizID}/submit`, payload, { headers }).subscribe({
      next: (res) => {
        if (res && res.ok) {
          this.submitted = true;
          this.result = { score: res.score, total: res.total, passed: res.passed };
          this.clearSession();
          this.clearTimer();
        }
      },
      error: (err) => {
        console.warn('Failed to submit quiz', err);
        alert(err?.error?.message || 'Failed to submit quiz');
      }
    });
  }

  finishAfterSubmit(): void {
    // navigate back to quizzes and allow list to refresh
    this.router.navigate(['/quizzes']);
  }
}
