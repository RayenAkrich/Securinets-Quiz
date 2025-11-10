import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

interface QuizSession {
  quizID: number;
  startAt: number; // epoch ms
  expiresAt?: number; // epoch ms
  sessionId?: string;
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
          <button class="nav-left" (click)="prevQuestion()">◀ Back</button>
          <h3 class="modal-title">{{ quiz.title }}</h3>
          <button class="nav-right" (click)="nextQuestion()">Next ▶</button>
          <div class="timer" *ngIf="hasTimer">{{ timeLeftDisplay }}</div>
          <div class="expired-banner" *ngIf="sessionExpired" title="Session expired">Session expired</div>
          <button class="close" (click)="closeModal()">✕</button>
        </div>

        <div class="modal-body">

          <div class="question-topbar centered">
            <button class="btn pager-prev" (click)="wheelPrevPage()" [disabled]="wheelPage === 0">◀</button>
            <button class="btn pager-next" (click)="wheelNextPage()" [disabled]="(wheelPage + 1) * WHEEL_VISIBLE >= (quiz.questions?.length || 0)">▶</button>
            <div class="question-wheel-centered">
              <div class="question-wheel">
                <button *ngFor="let q of visibleQuestions(); let i = index" class="question-dot" [class.active]="(wheelPage * WHEEL_VISIBLE + i) === session.currentIndex" [class.saved]="savedAnswers[q.questionID]" (click)="gotoQuestion(wheelPage * WHEEL_VISIBLE + i)">{{ (wheelPage * WHEEL_VISIBLE + i) + 1 }}</button>
              </div>
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
                <button class="btn submit" (click)="confirmOrSubmit()" [disabled]="sessionExpired || isSaving">
                  {{ isLastQuestion() ? 'Submit Quiz' : (isSaving ? 'Saving...' : 'Confirm Question') }}
                </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Result overlay after submission (show only score to members) -->
    <div *ngIf="submitted && result" class="result-overlay">
      <div class="result-box">
        <h2>Your Score</h2>
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
  .timer { z-index: 20; font-size: 0.95rem }
    .expired-banner { position:absolute; right:12px; top:12px; color:#a8071a; font-weight:700; background: rgba(255,240,240,0.9); padding:4px 8px; border-radius:6px; border:1px solid rgba(168,7,26,0.12) }

    .modal-body { padding:16px }
    .question-topbar.centered { position: relative; padding: 12px 8px 6px 8px; margin-bottom:12px }
    .pager-prev { position: absolute; left: 8px; top: 8px; background: transparent; border: none; font-size:1rem; cursor:pointer; padding:6px 8px }
    .pager-next { position: absolute; right: 8px; top: 8px; background: transparent; border: none; font-size:1rem; cursor:pointer; padding:6px 8px }
    .question-wheel-centered { display:flex; justify-content:center; width:100% }
    .question-wheel { display:flex; gap:6px; flex-wrap:wrap; justify-content:center }
  .question-dot { min-width:34px; height:34px; border-radius:6px; border:1px solid #d9d9d9; background:#f6ffed; color:#262626; font-weight:600 }
  .question-dot.active { background:#b7eb8f; border-color:#73d13d }
  .question-dot.saved { box-shadow: inset 0 0 0 3px rgba(24,144,255,0.06); }

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
  sessionExpired = false;
  readonly GRACE_MS = 5000; // 5 seconds grace window to tolerate clock skew/race
  submitted = false;
  result: any = null;
  // track per-question saved state
  savedAnswers: { [questionID: number]: boolean } = {};
  isSaving: boolean = false;
  // Question wheel pagination
  readonly WHEEL_VISIBLE = 7;
  wheelPage = 0;

  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.loadOrStartSession(id);
    window.addEventListener('beforeunload', this.beforeUnload);
  }

  // Normalize session.expiresAt to a numeric epoch-ms value when possible
  normalizeSessionTimestamps(serverSession: any | null, sessionObj: QuizSession): void {
    // Prefer server-provided epoch-ms fields
    try {
      // If server provides both server_now_ms and expires_at_ms, compute remaining on server and translate into a client epoch-ms
      if (serverSession && typeof serverSession.server_now_ms !== 'undefined' && typeof serverSession.expires_at_ms !== 'undefined') {
        const serverNow = Number(serverSession.server_now_ms);
        const expiresAtMs = Number(serverSession.expires_at_ms);
        if (!isNaN(serverNow) && !isNaN(expiresAtMs)) {
          const remaining = expiresAtMs - serverNow;
          if (remaining > 0) {
            // set client's expiresAt to local now + remaining to compensate clock skew
            sessionObj.expiresAt = Date.now() + remaining;
            return;
          } else {
            sessionObj.expiresAt = undefined as any;
            return;
          }
        }
      }

      // fallback: try numeric expires_at_ms or parse ISO expires_at
      let expires: any = null;
      if (serverSession && (serverSession.expires_at_ms || serverSession.expires_at)) {
        if (serverSession.expires_at_ms) expires = Number(serverSession.expires_at_ms);
        else expires = Date.parse(serverSession.expires_at);
      } else if (sessionObj && typeof sessionObj.expiresAt !== 'undefined') {
        expires = sessionObj.expiresAt;
      }

      if (typeof expires === 'string') expires = Number(expires);
      if (typeof expires === 'number' && !isNaN(expires)) {
        // if it's in seconds (10-digit), convert to ms
        if (expires < 1e12) expires = expires * 1000;
        sessionObj.expiresAt = expires;
      } else {
        // leave undefined if invalid
        sessionObj.expiresAt = undefined as any;
      }
    } catch (e) {
      console.warn('Failed to normalize session timestamps', e);
      sessionObj.expiresAt = undefined as any;
    }
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
          const now = Date.now();
          const serverSession = res.session || null;
          if (!this.session || this.session.quizID !== this.quiz.quizID) {
            // Build new session from server data if present
            let startAt = now;
            let expiresAt = this.quiz.timelimit && this.quiz.timelimit > 0 ? now + this.quiz.timelimit * 60 * 1000 : undefined;
            let sessionId: string | undefined = undefined;
            if (serverSession) {
              sessionId = serverSession.session_id || serverSession.sessionId || undefined;
              // prefer numeric epoch-ms fields if provided by the server
              if (serverSession.start_at_ms) startAt = Number(serverSession.start_at_ms);
              else if (serverSession.start_at) startAt = Date.parse(serverSession.start_at) || startAt;
              if (serverSession.expires_at_ms) expiresAt = Number(serverSession.expires_at_ms);
              else if (serverSession.expires_at) expiresAt = Date.parse(serverSession.expires_at) || expiresAt;
            }
            this.session = { quizID: this.quiz.quizID, startAt, expiresAt, sessionId, answersMap: {}, currentIndex: 0 };
            // normalize numeric/iso/seconds timestamps into epoch-ms
            this.normalizeSessionTimestamps(serverSession, this.session);
            // If server didn't provide a valid expiresAt but quiz timelimit exists, derive expiresAt from startAt
            if (!(this.session && typeof this.session.expiresAt === 'number' && isFinite(this.session.expiresAt)) && this.quiz && this.quiz.timelimit) {
              const start = (this.session && typeof this.session.startAt === 'number') ? this.session.startAt : Date.now();
              try { this.session.expiresAt = start + (Number(this.quiz.timelimit) * 60 * 1000); } catch (e) { /* ignore */ }
            }
            (this.quiz.questions || []).forEach((q: any) => this.session.answersMap[q.questionID] = null);
            this.saveSession();
          } else {
            // ensure answers map has all keys; also update sessionId/expiry from server if provided
            if (serverSession) {
              this.session.sessionId = serverSession.session_id || serverSession.sessionId || this.session.sessionId;
                // normalize session timestamps (will set expiresAt appropriately)
                this.normalizeSessionTimestamps(serverSession, this.session);
                // If server didn't provide a valid expiresAt but quiz timelimit exists, derive expiresAt from startAt
                if (!(this.session && typeof this.session.expiresAt === 'number' && isFinite(this.session.expiresAt)) && this.quiz && this.quiz.timelimit) {
                  const start = (this.session && typeof this.session.startAt === 'number') ? this.session.startAt : Date.now();
                  try { this.session.expiresAt = start + (Number(this.quiz.timelimit) * 60 * 1000); } catch (e) { /* ignore */ }
                }
            }
            (this.quiz.questions || []).forEach((q: any) => {
              if (!(q.questionID in this.session.answersMap)) this.session.answersMap[q.questionID] = null;
            });
            this.saveSession();
          }

          // debug: print session to console for troubleshooting
          try { console.debug('TakeQuiz session after start:', JSON.parse(JSON.stringify(this.session))); } catch (e) {}

          // Start timer only when expiresAt is valid; support a small grace window so tiny clock skew doesn't immediately expire the UI.
          if (this.session && typeof this.session.expiresAt === 'number' && isFinite(this.session.expiresAt)) {
            const remaining = this.session.expiresAt - Date.now();
            this.sessionExpired = remaining <= -this.GRACE_MS;
            this.hasTimer = remaining > -this.GRACE_MS; // show timer even for small negative remaining within grace window
          } else {
            this.sessionExpired = false;
            this.hasTimer = false;
          }
          console.debug('hasTimer:', this.hasTimer, 'sessionExpired:', this.sessionExpired, 'expiresAt:', this.session && this.session.expiresAt, 'now:', Date.now());
          if (this.hasTimer) {
            // set initial display immediately and start interval
            this.updateTimeLeft();
            this.startTimer();
          }
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
    if (!this.session || typeof this.session.expiresAt !== 'number' || !isFinite(this.session.expiresAt)) return;
    const now = Date.now();
    const diffRaw = this.session.expiresAt - now;
    const diff = Math.max(0, diffRaw);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    this.timeLeftDisplay = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    // Update sessionExpired in case it falls past the grace window while viewing
    this.sessionExpired = diffRaw <= -this.GRACE_MS;
    // Only auto-submit when we've passed the grace window (so tiny skews don't auto-submit immediately)
    if (diffRaw <= -this.GRACE_MS) {
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
    // ensure wheel page contains the selected question
    this.wheelPage = Math.floor(i / this.WHEEL_VISIBLE);
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

  // New flow: confirm/save current question to server. If last question, this will submit the quiz.
  confirmOrSubmit(): void {
    if (!this.quiz || !this.currentQuestion) return;
    if (this.isLastQuestion()) {
      // Save current question first, then submit on success/fallback
      this.confirmQuestion(() => this.submit());
    } else {
      this.confirmQuestion();
    }
  }

  isLastQuestion(): boolean {
    return !!(this.quiz && this.session && this.session.currentIndex === (this.quiz.questions?.length - 1));
  }

  confirmQuestion(onSaved?: () => void): void {
    if (!this.quiz || !this.currentQuestion || !this.session) return;
    const q = this.currentQuestion;
    const qid = q.questionID;
    const answerID = this.session.answersMap[qid] ?? null;
    // If no answer selected, ask user to confirm saving empty answer
    if (answerID === null) {
      const ok = confirm('You have not selected an answer for this question. Save empty answer?');
      if (!ok) return;
    }
    this.isSaving = true;
    const payload: any = { questionID: qid, answerID };
    if (this.session && this.session.sessionId) payload.session_id = this.session.sessionId;
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    // Try server-side per-question save endpoint. If it fails, fall back to local save.
    this.http.post<any>(`/api/quizzes/${this.quiz.quizID}/answer`, payload, { headers }).subscribe({
      next: (res) => {
        this.savedAnswers[qid] = true;
        this.isSaving = false;
        this.saveSession();
        if (onSaved) onSaved();
      },
      error: (err) => {
        console.warn('Per-question save failed, saving locally', err);
        // fallback: mark as saved locally so user can continue; final submit will still send all answers
        this.savedAnswers[qid] = true;
        this.isSaving = false;
        this.saveSession();
        if (onSaved) onSaved();
      }
    });
  }

  autoSubmit(): void {
    // submit automatically using current answers (null treated as no answer)
    alert('Time is up. Submitting your answers.');
    this.submit();
  }

  submit(): void {
    if (!this.quiz) return;
    const answersPayload = (this.quiz.questions || []).map((q: any) => ({ questionID: q.questionID, answerID: this.session.answersMap[q.questionID] }));
    const payload: any = { answers: answersPayload };
    if (this.session && this.session.sessionId) payload.session_id = this.session.sessionId;
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.post<any>(`/api/quizzes/${this.quiz.quizID}/submit`, payload, { headers }).subscribe({
      next: (res) => {
        if (res && res.ok) {
          this.submitted = true;
          // Only expose numeric score and total to members — do not show pass/fail
          this.result = { score: res.score, total: res.total };
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

  visibleQuestions(): any[] {
    if (!this.quiz || !Array.isArray(this.quiz.questions)) return [];
    const start = this.wheelPage * this.WHEEL_VISIBLE;
    return (this.quiz.questions || []).slice(start, start + this.WHEEL_VISIBLE);
  }

  wheelPrevPage(): void {
    if (this.wheelPage > 0) {
      this.wheelPage--;
    }
  }

  wheelNextPage(): void {
    const total = (this.quiz && Array.isArray(this.quiz.questions)) ? this.quiz.questions.length : 0;
    const maxPage = Math.max(0, Math.ceil(total / this.WHEEL_VISIBLE) - 1);
    if (this.wheelPage < maxPage) this.wheelPage++;
  }
}
