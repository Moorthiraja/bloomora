import { Injectable, signal, NgZone, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

export interface User {
  name: string;
  email: string;
  isLoggedIn: boolean;
}

interface StoredSession {
  name: string;
  email: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private readonly SESSION_KEY = 'bloomora_session';
  private readonly SESSION_DURATION = 15 * 60 * 1000; // 15 minutes
  private expiryTimer: any;

  user = signal<User>({ name: '', email: '', isLoggedIn: false });

  private ngZone = inject(NgZone);
  private router = inject(Router);

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  isLoggedIn(): boolean {
    return this.user().isLoggedIn;
  }

  sendOtp(name: string, email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/send-otp`,
      { name, email }
    );
  }

  verifyOtp(email: string, code: string): Observable<{
    success: boolean;
    message: string;
    user: { name: string; email: string; isNew: boolean };
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      user: { name: string; email: string; isNew: boolean };
    }>(`${this.apiUrl}/verify-otp`, { email, code });
  }

  login(name: string, email: string) {
    const expiresAt = Date.now() + this.SESSION_DURATION;
    this.user.set({ name, email, isLoggedIn: true });
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ name, email, expiresAt }));
    this.startExpiryTimer(expiresAt);
  }

  logout() {
    this.clearSession();
    this.user.set({ name: '', email: '', isLoggedIn: false });
  }

  private restoreSession() {
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      if (!data) return;

      const session: StoredSession = JSON.parse(data);
      if (Date.now() >= session.expiresAt) {
        this.clearSession();
        return;
      }

      this.user.set({ name: session.name, email: session.email, isLoggedIn: true });
      this.startExpiryTimer(session.expiresAt);
    } catch {
      this.clearSession();
    }
  }

  private startExpiryTimer(expiresAt: number) {
    clearTimeout(this.expiryTimer);
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      this.expireSession();
      return;
    }
    this.ngZone.runOutsideAngular(() => {
      this.expiryTimer = setTimeout(() => {
        this.ngZone.run(() => this.expireSession());
      }, remaining);
    });
  }

  private expireSession() {
    this.clearSession();
    this.user.set({ name: '', email: '', isLoggedIn: false });
    this.router.navigate(['/']);
  }

  private clearSession() {
    clearTimeout(this.expiryTimer);
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem('bloomora_cart');
  }
}
