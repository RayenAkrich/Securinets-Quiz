import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-panel-layout">
      <div class="quizzes-section">
        <div class="section-header">
          <h2>Quizzes</h2>
          <button class="btn add-btn">Add New Quiz</button>
        </div>
        <div class="quizzes-list">
          <!-- Example quiz cards, replace with *ngFor later -->
          <div class="quiz-card" *ngFor="let quiz of quizzes">
            <div class="quiz-title">{{ quiz.title }}</div>
            <div class="quiz-desc">{{ quiz.description }}</div>
            <div class="quiz-actions">
              <button class="btn edit-btn">Edit</button>
              <button class="btn delete-btn">Delete</button>
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
  `]
})
export class AdminComponent implements OnInit {
  quizzes = [
    { title: 'Sample Quiz 1', description: 'A sample quiz for demonstration.' },
    { title: 'Sample Quiz 2', description: 'Another quiz example.' }
  ];
  users: any[] = [];
  adminEmail: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Get admin email from localStorage (set at login)
    this.adminEmail = localStorage.getItem('userEmail') || '';
    this.fetchUsers();
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
}
