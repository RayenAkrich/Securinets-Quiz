import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// Only allow admins to access the route
export const adminGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return false;
  }
  const http = inject(HttpClient);
  const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  return http.get<any>('/api/me', { headers }).pipe(
    map(res => {
      if (res && res.ok && res.user && res.user.role === 'admin') {
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
