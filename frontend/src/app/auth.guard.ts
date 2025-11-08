import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem('token');
  if (!token) {
    // Allow access to login, signup, and welcome
    const allowed = ['/', '/login', '/signup', ''];
    if (allowed.includes(state.url)) {
      return true;
    }
    window.location.href = '/';
    return false;
  }
  const http = inject(HttpClient);
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  return http.get<any>('/api/me', { headers }).pipe(
    map(res => {
      if (res && res.ok && res.user) {
        return true;
      } else {
        window.location.href = '/';
        return false;
      }
    }),
    catchError(() => {
      window.location.href = '/';
      return of(false);
    })
  );
};
