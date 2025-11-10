import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-panel-layout">
      <div class="quizzes-section">
        <div class="section-header">
          <h2>Quizzes</h2>
          <button class="btn add-btn" (click)="openQuizModal()">Add New Quiz</button>
        </div>
            <div class="quizzes-list">
              <div *ngIf="quizzes.length === 0">No quizzes available.</div>
              <div class="quiz-card" *ngFor="let quiz of quizzes">
                <div class="quiz-title">{{ quiz.title }}</div>
                <div class="quiz-desc">{{ quiz.description }}</div>
                <div class="small-muted">Questions: {{ quiz.question_count || 0 }} | Time limit: {{ quiz.timelimit || 0 }} mins</div>
                <div class="quiz-actions">
                  <button class="btn edit-btn" (click)="editQuiz(quiz.quizID)">Edit</button>
                  <button class="btn results-btn" (click)="showResults(quiz.quizID)">Show Results</button>
                  <button class="btn delete-btn" (click)="deleteQuiz(quiz.quizID)">Delete</button>
                </div>
              </div>
                <!-- Results modal -->
                <div class="modal-backdrop" *ngIf="showResultsModal">
                  <div class="modal">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <h3>Results for: {{ resultsQuizTitle || 'Quiz' }}</h3>
                      <button class="close" (click)="closeResults()">✕</button>
                    </div>
                    <div style="margin-top:12px;">
                      <div *ngIf="results.length === 0">No results yet.</div>
                      <table *ngIf="results.length > 0" style="width:100%; border-collapse:collapse; margin-top:8px;">
                        <thead>
                          <tr>
                            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee">Name</th>
                            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee">Email</th>
                            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee">Score</th>
                            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee">Passed</th>
                            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee">Taken At</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let r of results">
                            <td style="padding:8px; border-bottom:1px solid #fafafa">{{ r.name }}</td>
                            <td style="padding:8px; border-bottom:1px solid #fafafa">{{ r.email }}</td>
                            <td style="padding:8px; border-bottom:1px solid #fafafa">{{ r.score }} / {{ resultsTotal }}</td>
                            <td style="padding:8px; border-bottom:1px solid #fafafa">{{ r.passed ? 'Yes' : 'No' }}</td>
                            <td style="padding:8px; border-bottom:1px solid #fafafa">{{ r.taken_at }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div class="modal-actions" style="margin-top:12px;">
                      <button class="btn edit-btn" (click)="closeResults()">Close</button>
                    </div>
                  </div>
                </div>
            </div>
      </div>
      <!-- Quiz creation modal -->
      <div class="modal-backdrop" *ngIf="showQuizModal">
        <div class="modal">
          <h3 *ngIf="!showQuestionForm">Create New Quiz - Settings</h3>
          <h3 *ngIf="showQuestionForm">Add Questions to: {{ newQuiz.title }}</h3>

          <!-- Quiz settings -->
          <div *ngIf="!showQuestionForm">
            <label>Title</label>
            <input type="text" [(ngModel)]="newQuiz.title" />
            <label>Description</label>
            <textarea rows="3" [(ngModel)]="newQuiz.description"></textarea>
            <label>Time limit (minutes)</label>
            <input type="number" min="0" [(ngModel)]="newQuiz.timelimit" />
            <div class="modal-actions">
              <button class="btn edit-btn" (click)="confirmQuizSettings()" [disabled]="!newQuiz.title">Confirm</button>
              <button class="btn delete-btn" (click)="closeQuizModal()">Cancel</button>
            </div>
          </div>

          <!-- Question adding area: show a single question editor and a chooser wheel -->
          <div *ngIf="showQuestionForm">
            <div class="question-topbar">
              <!-- prev/next placed absolutely top-left and top-right; wheel centered -->
              <button class="btn edit-btn pager-prev" (click)="wheelPrevPage()" [disabled]="wheelPage === 0">◀</button>
              <button class="btn edit-btn pager-next" (click)="wheelNextPage()" [disabled]="(wheelPage + 1) * WHEEL_VISIBLE >= (newQuiz.questions?.length || 0)">▶</button>
              <div class="question-wheel-centered">
                <div class="question-wheel">
                  <button *ngFor="let q of visibleQuestions(); let i = index" class="question-dot" [class.active]="(wheelPage * WHEEL_VISIBLE + i) === currentQuestionIndex" (click)="gotoQuestion(wheelPage * WHEEL_VISIBLE + i)">{{ (wheelPage * WHEEL_VISIBLE + i) + 1 }}</button>
                </div>
              </div>
              <button class="btn edit-btn add-question-btn" (click)="createNewQuestionAndEdit()">＋</button>
            </div>

            <div *ngIf="newQuiz.questions.length === 0 && !showQuestionInputs" class="no-questions">
              <p>No questions yet. Click + to add the first question.</p>
            </div>

            <!-- Question inputs (single editor) -->
            <div *ngIf="showQuestionInputs || newQuiz.questions.length > 0" class="question-form">
              <label>Question Title</label>
              <input type="text" [(ngModel)]="currentQuestion.title" />
              <label>Category</label>
              <input type="text" [(ngModel)]="currentQuestion.category" />
              <label>Difficulty</label>
              <input type="text" [(ngModel)]="currentQuestion.difficulty" />
              <label>Points</label>
              <input type="number" min="0" [(ngModel)]="currentQuestion.points" />
              <label>Description</label>
              <textarea rows="2" [(ngModel)]="currentQuestion.description"></textarea>

              <div class="answers-block">
                <h5>Answers</h5>
                <div *ngFor="let a of currentQuestion.answers; let ai = index" class="answer-row">
                  <span>{{ a.text }} <small *ngIf="a.is_correct">(correct)</small></span>
                  <div>
                    <button class="btn delete-btn" (click)="removeAnswer(ai)">Remove</button>
                    <button class="btn" style="margin-left:0.4rem;" (click)="markCorrect(ai)">Mark Correct</button>
                  </div>
                </div>

                <div class="add-answer-row">
                  <input type="text" placeholder="Answer text" [(ngModel)]="currentAnswer.text" />
                  <label><input type="checkbox" [(ngModel)]="currentAnswer.is_correct" /> Correct</label>
                  <button class="btn edit-btn" (click)="addAnswer()">Add Answer</button>
                </div>
              </div>

              <div class="modal-actions">
                <button class="btn edit-btn" (click)="addQuestion()" [disabled]="!currentQuestion.title || currentQuestion.answers.length === 0">Save Question</button>
                <button class="btn delete-btn" (click)="cancelQuestion()">Cancel</button>
                <button *ngIf="newQuiz.questions.length > 0" class="btn delete-btn" (click)="deleteQuestion(currentQuestionIndex)">Delete Question</button>
              </div>
            </div>

            <div class="modal-actions" style="margin-top:1rem;">
              <button class="btn edit-btn" (click)="finishQuiz()" [disabled]="newQuiz.questions.length === 0">Finish Quiz</button>
              <button class="btn delete-btn" (click)="closeQuizModal(true)">Cancel All</button>
            </div>
          </div>
        </div>
      </div>
      <div class="users-section">
        <h2>Users List</h2>
        <div class="users-list">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                 <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users">
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.role }}</td>
                <td>
                  <button class="btn delete-btn" [disabled]="user.role === 'admin' || user.email === adminEmail" (click)="deleteUser(user)">Delete</button>
                  <button class="btn ban-btn" [disabled]="user.role === 'admin' || user.email === adminEmail || user.role === 'banned'" (click)="banUser(user)">Ban</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-panel-layout {
      display: flex;
      flex-direction: row;
      gap: 2rem;
      justify-content: center;
      align-items: flex-start;
      margin: 40px 0;
    }
    .quizzes-section {
      flex: 2;
      background: #f0f7ff;
      border: 2px solid #1890ff;
      border-radius: 12px;
      padding: 2rem 1.5rem;
      min-width: 350px;
      box-shadow: 0 2px 8px rgba(24,144,255,0.08);
    }
    .section-header {
      color :   #1890ff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .add-btn {
      background: #52c41a;
      color: #fff;
      border: none;
      padding: 0.5rem 1.2rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .add-btn:hover { background: #389e0d; }
    .quizzes-list {
      color: #000;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .quiz-card {
      background: #fff;
      border: 1px solid #bae7ff;
      border-radius: 8px;
      padding: 1rem 1.2rem;
      box-shadow: 0 1px 4px rgba(24,144,255,0.06);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .quiz-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #1890ff;
    }
    .quiz-desc {
      color: #595959;
      font-size: 1rem;
    }
    .quiz-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .edit-btn {
      background: #1890ff;
      color: #fff;
      border: none;
      padding: 0.3rem 1rem;
      border-radius: 5px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    .edit-btn:hover { background: #096dd9; }
    .delete-btn {
      background: #ff4d4f;
      color: #fff;
      border: none;
      padding: 0.3rem 1rem;
      border-radius: 5px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    .delete-btn:hover { background: #a8071a; }
    .ban-btn {
      background: #faad14;
      color: #fff;
      border: none;
      padding: 0.3rem 1rem;
      border-radius: 5px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 0.5rem;
      transition: background 0.2s;
    }
    .ban-btn:hover { background: #ad6800; }
    .users-section {
      flex: 1.4;
      background: #fffbe6;
      border: 2px solid #faad14;
      border-radius: 12px;
      padding: 2rem 1.2rem;
      min-width: 620px; /* increased to allow two action buttons on one line */
      box-shadow: 0 2px 8px rgba(250,173,20,0.08);
    }
    .users-section h2 {
      color: #faad14;
      margin-bottom: 1rem;
      font-size: 1.3rem;
    }
    .users-list table {
      width: 100%;
      border-collapse: collapse;
    }
    .users-list th, .users-list td {
      padding: 0.5rem 0.7rem;
      text-align: left;
      border-bottom: 1px solid #ffe58f;
    }
    .users-list th {
      background: #fffbe6;
      color: #ad6800;
      font-weight: 600;
    }
    .users-list td {
      color: #614700;
    }
    .users-list tr:last-child td {
      border-bottom: none;
    }
    /* Modal styles */
    .modal-backdrop {
      color: #000000;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    }
    .modal {
      background: #fff;
      padding: 1.2rem;
      border-radius: 8px;
      width: 720px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 6px 24px rgba(0,0,0,0.3);
    }
    .modal input[type="text"], .modal input[type="number"], .modal textarea {
      width: 100%;
      padding: 0.4rem;
      margin: 0.3rem 0 0.8rem 0;
      border-radius: 4px;
      border: 1px solid #ddd;
      box-sizing: border-box;
    }
    .modal .modal-actions { display:flex; gap:0.6rem; margin-top:0.6rem }
    .quiz-card.small { padding: 0.6rem; margin: 0.4rem 0; background: #fafafa; border: 1px solid #eee }
    .small-muted { color: #888; font-size: 0.9rem }
    .answers-block { margin-top: 0.6rem }
    .answer-row { display:flex; justify-content:space-between; align-items:center; gap:0.6rem; padding:0.2rem 0 }
    .add-answer-row { display:flex; gap:0.5rem; align-items:center; margin-top:0.6rem }
  .question-topbar { position: relative; padding: 1.6rem 0.8rem 0.6rem 0.8rem; margin-bottom:0.6rem }
  .pager-prev { position: absolute; left: 12px; top: 8px; }
  .pager-next { position: absolute; right: 12px; top: 8px; }
  .add-question-btn { position: absolute; right: 54px; top: 8px; margin-right: 20px; }
  .question-wheel-centered { display:flex; justify-content:center; width:100%; }
  .question-wheel { display:flex; gap:0.4rem; align-items:center; justify-content:center; }
  .question-dot { width:34px; height:28px; border-radius:6px; border:1px solid #d9d9d9; background:#f6ffed; color:#262626; }
  .question-dot.active { background:#b7eb8f; border-color:#73d13d; font-weight:700 }
  .no-questions { color:#666; padding:0.6rem 0 }
    .results-btn { background: #722ed1; color:#fff; border: none; padding: 0.3rem 0.9rem; border-radius:5px; font-weight:500; cursor:pointer }
    .results-btn:hover { background:#531dab }
  `]
})
export class AdminComponent implements OnInit {
  quizzes: any[] = [];
  users: any[] = [];
  adminEmail: string = '';
  // Results modal state
  showResultsModal: boolean = false;
  results: any[] = [];
  resultsTotal: number = 0;
  resultsQuizTitle: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Get admin email from localStorage (set at login)
    this.adminEmail = localStorage.getItem('userEmail') || '';
    this.fetchUsers();
    this.fetchQuizzes();
  }

  fetchQuizzes(): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.get<any>('/api/admin/quizzes', { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && Array.isArray(res.quizzes)) {
          this.quizzes = res.quizzes.map((q: any) => ({
            quizID: q.quizID,
            title: q.title,
            description: q.description,
            timelimit: q.timelimit,
            question_count: q.question_count
          }));
        }
      },
      error: (err) => {
        console.warn('Failed to fetch quizzes list', err);
        // If the Angular dev server isn't proxying /api to the backend (405 from :4200),
        // retry directly against the Flask backend at :5000 (common dev setup).
        if (err && (err.status === 405 || err.status === 0 || err.status >= 400)) {
          const backendUrl = 'http://localhost:5000/api/admin/quizzes';
          this.http.get<any>(backendUrl, { headers }).subscribe({
            next: (res2) => {
              if (res2 && res2.ok && Array.isArray(res2.quizzes)) {
                this.quizzes = res2.quizzes.map((q: any) => ({
                  quizID: q.quizID,
                  title: q.title,
                  description: q.description,
                  timelimit: q.timelimit,
                  question_count: q.question_count
                }));
              }
            },
            error: (err2) => {
              console.warn('Retry to backend failed', err2);
            }
          });
        }
      }
    });
  }

  // Quiz creation UI state
  showQuizModal: boolean = false;
  showQuestionForm: boolean = false; // after confirming settings
  showQuestionInputs: boolean = false; // when clicking Add Question
  newQuiz: any = { title: '', description: '', timelimit: 0, questions: [] };
  currentQuestion: any = { title: '', category: '', difficulty: '', points: 0, description: '', answers: [] };
  currentAnswer: any = { text: '', is_correct: false };
  currentQuestionIndex: number = 0;
  editingExisting: boolean = false;
  // wheel pagination for admin question editor
  readonly WHEEL_VISIBLE = 7;
  wheelPage = 0;

  openQuizModal(): void {
    this.showQuizModal = true;
    this.showQuestionForm = false;
    this.showQuestionInputs = false;
    this.newQuiz = { title: '', description: '', timelimit: 0, questions: [] };
    this.currentQuestion = { title: '', category: '', difficulty: '', points: 0, description: '', answers: [] };
    this.currentAnswer = { text: '', is_correct: false };
  }

  closeQuizModal(cancelAll: boolean = false): void {
    if (cancelAll) {
      this.showQuizModal = false;
      this.showQuestionForm = false;
      this.showQuestionInputs = false;
      this.newQuiz = { title: '', description: '', timelimit: 0, questions: [] };
    } else {
      this.showQuizModal = false;
    }
  }

  confirmQuizSettings(): void {
    if (!this.newQuiz.title) return;
    this.showQuestionForm = true;
    this.showQuestionInputs = false;
    // initialize navigator
    if (this.newQuiz.questions.length > 0) {
      this.currentQuestionIndex = 0;
      this.currentQuestion = this.newQuiz.questions[0];
      this.editingExisting = true;
      this.showQuestionInputs = true;
    }
  }

  addAnswer(): void {
    const text = (this.currentAnswer.text || '').trim();
    if (!text) return;
    this.currentQuestion.answers.push({ text, is_correct: !!this.currentAnswer.is_correct });
    this.currentAnswer = { text: '', is_correct: false };
  }

  removeAnswer(index: number): void {
    this.currentQuestion.answers.splice(index, 1);
  }

  addQuestion(): void {
    if (!this.currentQuestion.title || this.currentQuestion.answers.length === 0) return;
    if (this.editingExisting && this.currentQuestionIndex < this.newQuiz.questions.length) {
      // already editing an existing question; changes are bound
      // just close inputs
      this.showQuestionInputs = false;
      return;
    }
    // push a copy for new question
    this.newQuiz.questions.push(JSON.parse(JSON.stringify(this.currentQuestion)));
    // set as current
    this.currentQuestionIndex = this.newQuiz.questions.length - 1;
    this.editingExisting = true;
    // reset currentQuestion template
    this.currentQuestion = { title: '', category: '', difficulty: '', points: 0, description: '', answers: [] };
    this.currentAnswer = { text: '', is_correct: false };
    this.showQuestionInputs = false;
  }

  cancelQuestion(): void {
    this.showQuestionInputs = false;
    this.currentQuestion = { title: '', category: '', difficulty: '', points: 0, description: '', answers: [] };
    this.currentAnswer = { text: '', is_correct: false };
    this.editingExisting = false;
  }

  createNewQuestionAndEdit(): void {
    this.showQuestionInputs = true;
    this.editingExisting = false;
    this.currentQuestion = { title: '', category: '', difficulty: '', points: 0, description: '', answers: [] };
    this.currentAnswer = { text: '', is_correct: false };
    // if no questions yet, keep index at 0, otherwise will push on save
    this.currentQuestionIndex = this.newQuiz.questions.length;
  }

  visibleQuestions(): any[] {
    if (!this.newQuiz || !Array.isArray(this.newQuiz.questions)) return [];
    const start = this.wheelPage * this.WHEEL_VISIBLE;
    return (this.newQuiz.questions || []).slice(start, start + this.WHEEL_VISIBLE);
  }

  wheelPrevPage(): void {
    if (this.wheelPage > 0) this.wheelPage--;
  }

  wheelNextPage(): void {
    const total = (this.newQuiz && Array.isArray(this.newQuiz.questions)) ? this.newQuiz.questions.length : 0;
    const maxPage = Math.max(0, Math.ceil(total / this.WHEEL_VISIBLE) - 1);
    if (this.wheelPage < maxPage) this.wheelPage++;
  }

  gotoQuestion(i: number): void {
    if (i < 0 || i >= this.newQuiz.questions.length) return;
    this.currentQuestionIndex = i;
    this.currentQuestion = this.newQuiz.questions[i];
    this.editingExisting = true;
    this.showQuestionInputs = true;
    // ensure wheel page contains the selected question
    this.wheelPage = Math.floor(i / this.WHEEL_VISIBLE);
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.gotoQuestion(this.currentQuestionIndex - 1);
    }
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex < this.newQuiz.questions.length - 1) {
      this.gotoQuestion(this.currentQuestionIndex + 1);
    }
  }

  markCorrect(ai: number): void {
    // ensure only one correct answer
    this.currentQuestion.answers.forEach((a: any, idx: number) => a.is_correct = (idx === ai));
  }

  deleteQuestion(index: number): void {
    if (index < 0 || index >= this.newQuiz.questions.length) return;
    this.newQuiz.questions.splice(index, 1);
    if (this.newQuiz.questions.length === 0) {
      this.currentQuestionIndex = 0;
      this.showQuestionInputs = false;
      this.editingExisting = false;
      this.currentQuestion = { title: '', category: '', difficulty: '', points: 0, description: '', answers: [] };
    } else {
      const newIndex = Math.max(0, index - 1);
      this.gotoQuestion(newIndex);
    }
  }

  finishQuiz(): void {
    const q = {
      title: this.newQuiz.title,
      description: this.newQuiz.description,
      timelimit: this.newQuiz.timelimit,
      questions: this.newQuiz.questions
    };
    // send to backend endpoint to persist (endpoint may not exist yet)
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    // If editing an existing quiz, perform PUT
    if (this.newQuiz.quizID) {
      this.http.put<any>(`/api/admin/quizzes/${this.newQuiz.quizID}`, q, { headers }).subscribe({
        next: (res) => {
          this.fetchQuizzes();
          this.showQuizModal = false;
          this.showQuestionForm = false;
          this.showQuestionInputs = false;
          this.newQuiz = { title: '', description: '', timelimit: 0, questions: [] };
        },
        error: (err) => {
          console.warn('Failed to persist quiz update to backend, updating locally', err);
          // fallback: update local list
          const idx = this.quizzes.findIndex(qz => qz.quizID === this.newQuiz.quizID);
          if (idx >= 0) this.quizzes[idx] = q;
          else this.quizzes.push(q);
          this.showQuizModal = false;
          this.showQuestionForm = false;
          this.showQuestionInputs = false;
          this.newQuiz = { title: '', description: '', timelimit: 0, questions: [] };
        }
      });
      return;
    }

    this.http.post<any>('/api/admin/quizzes', q, { headers }).subscribe({
      next: (res) => {
        // on success, refresh quizzes list from backend
        this.fetchQuizzes();
        this.showQuizModal = false;
        this.showQuestionForm = false;
        this.showQuestionInputs = false;
        this.newQuiz = { title: '', description: '', timelimit: 0, questions: [] };
      },
      error: (err) => {
        // if endpoint not available, still push locally as fallback
        console.warn('Failed to persist quiz to backend, adding locally', err);
        this.quizzes.push(q);
        this.showQuizModal = false;
        this.showQuestionForm = false;
        this.showQuestionInputs = false;
        this.newQuiz = { title: '', description: '', timelimit: 0, questions: [] };
      }
    });
  }

  editQuiz(quizID: number): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.get<any>(`/api/admin/quizzes/${quizID}`, { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && res.quiz) {
          const q = res.quiz;
          // convert answers' is_correct to boolean if needed
          q.questions = (q.questions || []).map((qq: any) => ({
            title: qq.title,
            category: qq.category,
            difficulty: qq.difficulty,
            points: qq.points,
            description: qq.description,
            questionID: qq.questionID,
            answers: (qq.answers || []).map((a: any) => ({ text: a.text, is_correct: !!a.is_correct, answerID: a.answerID }))
          }));
          this.newQuiz = { quizID: q.quizID, title: q.title, description: q.description, timelimit: q.timelimit, questions: q.questions };
          this.showQuizModal = true;
          this.showQuestionForm = true;
          // initialize navigator
          if (this.newQuiz.questions.length > 0) {
            this.currentQuestionIndex = 0;
            this.currentQuestion = this.newQuiz.questions[0];
            this.editingExisting = true;
            this.showQuestionInputs = true;
          } else {
            this.currentQuestion = { title: '', category: '', difficulty: '', points: 0, description: '', answers: [] };
            this.showQuestionInputs = false;
          }
        }
      },
      error: (err) => {
        console.warn('Failed to fetch quiz for editing', err);
      }
    });
  }

  fetchUsers(): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.get<any>('/api/admin/users', { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && Array.isArray(res.users)) {
          this.users = res.users;
        }
      },
      error: (err) => {
        console.warn('Failed to fetch users list', err);
      }
    });
  }

  deleteUser(user: any): void {
    const reason = prompt(`Please provide a reason for deleting user ${user.email}:`);
    if (!reason || !reason.trim()) return;
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.request<any>('delete', `/api/admin/users/${user.userID}`, { headers, body: { reason } }).subscribe({
      next: (res) => {
        if (res && res.ok) {
          this.users = this.users.filter(u => u.userID !== user.userID);
        }
      },
      error: (err) => {
        alert('Failed to delete user');
      }
    });
  }

  banUser(user: any): void {
    const reason = prompt(`Please provide a reason for banning user ${user.email}:`);
    if (!reason || !reason.trim()) return;
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.patch<any>(`/api/admin/users/${user.userID}/ban`, { reason }, { headers }).subscribe({
      next: (res) => {
        if (res && res.ok) {
          this.users = this.users.map(u => u.userID === user.userID ? { ...u, role: 'banned' } : u);
        }
      },
      error: (err) => {
        alert('Failed to ban user');
      }
    });
  }

  deleteQuiz(quizID: number): void {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) return;
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.request<any>('delete', `/api/admin/quizzes/${quizID}`, { headers }).subscribe({
      next: (res) => {
        if (res && res.ok) {
          this.quizzes = this.quizzes.filter(q => q.quizID !== quizID);
        }
      },
      error: (err) => {
        alert('Failed to delete quiz');
      }
    });
  }

  showResults(quizID: number): void {
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    this.http.get<any>(`/api/admin/quizzes/${quizID}/results`, { headers }).subscribe({
      next: (res) => {
        if (res && res.ok && Array.isArray(res.quiz_results)) {
          this.results = res.quiz_results;
          this.resultsTotal = res.total || 0;
          const q = this.quizzes.find(qz => qz.quizID === quizID);
          this.resultsQuizTitle = q ? q.title : '';
          this.showResultsModal = true;
        }
      },
      error: (err) => {
        console.warn('Failed to fetch quiz results', err);
        alert(err?.error?.message || 'Failed to fetch results');
      }
    });
  }

  closeResults(): void {
    this.showResultsModal = false;
    this.results = [];
    this.resultsTotal = 0;
    this.resultsQuizTitle = '';
  }
}
