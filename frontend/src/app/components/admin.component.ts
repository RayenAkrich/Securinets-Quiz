import { Component } from '@angular/core';

@Component({
  selector: 'app-admin',
  standalone: true,
  template: `
    <div class="admin-container">
      <h1>Admin Panel</h1>
      <p>Welcome, mighty admin! Here you can manage the quiz system.</p>
    </div>
  `,
  styles: [`
    .admin-container {
      max-width: 500px;
      margin: 80px auto;
      padding: 2rem;
      background: #f0f7ff;
      border: 2px solid #1890ff;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(24,144,255,0.1);
    }
    .admin-container h1 {
      color: #1890ff;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .admin-container p {
      color: #003a8c;
      font-size: 1.2rem;
    }
  `]
})
export class AdminComponent {}
