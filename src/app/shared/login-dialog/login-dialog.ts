import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="login-dialog">
      <div class="dialog-accent"></div>

      <button class="close-btn" mat-icon-button (click)="close()">
        <mat-icon>close</mat-icon>
      </button>

      <div class="dialog-brand">
        <img src="/assets/logo.png" alt="Pearl n Craft" class="dialog-logo" />
      </div>

      <!-- ═══ STEP 1: Enter Name & Email ═══ -->
      @if (step() === 'credentials') {
        <h2>Welcome</h2>
        <p class="subtitle">Sign in to access your account &amp; exclusive offers</p>

        <div class="ornament">
          <span class="ornament-line"></span>
          <mat-icon class="ornament-icon">diamond</mat-icon>
          <span class="ornament-line"></span>
        </div>

        <form (ngSubmit)="onSendOtp()" class="login-form">
          <div class="field" [class.focused]="nameFocused()" [class.filled]="name.length > 0">
            <mat-icon class="field-icon">person_outline</mat-icon>
            <div class="field-inner">
              <label for="login-name">Full Name</label>
              <input
                id="login-name"
                type="text"
                [(ngModel)]="name"
                name="name"
                placeholder=" "
                required
                autocomplete="name"
                (focus)="nameFocused.set(true)"
                (blur)="nameFocused.set(false)"
              />
            </div>
          </div>

          <div class="field" [class.focused]="emailFocused()" [class.filled]="email.length > 0">
            <mat-icon class="field-icon">mail_outline</mat-icon>
            <div class="field-inner">
              <label for="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder=" "
                required
                autocomplete="email"
                (focus)="emailFocused.set(true)"
                (blur)="emailFocused.set(false)"
              />
            </div>
          </div>

          @if (error) {
            <div class="error">
              <mat-icon>error_outline</mat-icon>
              {{ error }}
            </div>
          }

          <button type="submit" class="login-btn" [disabled]="loading()">
            @if (loading()) {
              <span class="btn-text">Sending...</span>
              <mat-icon class="btn-arrow spin">autorenew</mat-icon>
            } @else {
              <span class="btn-text">Send Verification Code</span>
              <mat-icon class="btn-arrow">arrow_forward</mat-icon>
            }
          </button>
        </form>
      }

      <!-- ═══ STEP 2: Verify OTP ═══ -->
      @if (step() === 'otp') {
        <h2>Verify Email</h2>
        <p class="subtitle">We've sent a 6-digit code to <strong>{{ email }}</strong></p>

        <div class="ornament">
          <span class="ornament-line"></span>
          <mat-icon class="ornament-icon">lock</mat-icon>
          <span class="ornament-line"></span>
        </div>

        <form (ngSubmit)="onVerifyOtp()" class="login-form">
          <!-- OTP Boxes -->
          <div class="otp-container">
            @for (i of otpIndexes; track i) {
              <input
                class="otp-box"
                type="text"
                maxlength="1"
                inputmode="numeric"
                pattern="[0-9]"
                [attr.id]="'otp-' + i"
                [(ngModel)]="otpDigits[i]"
                [attr.name]="'otp' + i"
                (input)="onOtpInput($event, i)"
                (keydown)="onOtpKeydown($event, i)"
                (paste)="onOtpPaste($event)"
                autocomplete="one-time-code"
              />
            }
          </div>

          <p class="otp-timer">
            <a href="#" class="resend-link" [class.disabled]="resendCooldown() > 0"
              (click)="$event.preventDefault(); resendOtp()">
              @if (resendCooldown() > 0) {
                Resend Code in {{ resendCooldown() }}s
              } @else {
                Resend Code
              }
            </a>
          </p>

          @if (error) {
            <div class="error">
              <mat-icon>error_outline</mat-icon>
              {{ error }}
            </div>
          }

          <button type="submit" class="login-btn" [disabled]="loading() || otpCode.length < 6">
            @if (loading()) {
              <span class="btn-text">Verifying...</span>
              <mat-icon class="btn-arrow spin">autorenew</mat-icon>
            } @else {
              <span class="btn-text">Verify & Sign In</span>
              <mat-icon class="btn-arrow">check</mat-icon>
            }
          </button>

          <button type="button" class="back-btn" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Change email
          </button>
        </form>
      }

      <!-- ═══ STEP 3: Success ═══ -->
      @if (step() === 'success') {
        <div class="success-content">
          <div class="success-icon-wrap">
            <mat-icon class="success-icon">check_circle</mat-icon>
          </div>
          <h2>Welcome, {{ name }}!</h2>
          <p class="subtitle">{{ successMessage() }}</p>
        </div>
      }

      @if (step() !== 'success') {
        <p class="terms">By signing in, you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a></p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .login-dialog {
      padding: 40px 36px 32px;
      position: relative;
      min-width: 440px;
      background: linear-gradient(165deg, #0d0618 0%, #180036 30%, #37036f 60%, #1a0a2e 100%);
      overflow: hidden;
    }

    .dialog-accent {
      position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, #c5a04e, #e8cc7a, #c5a04e);
    }

    .close-btn {
      position: absolute; top: 12px; right: 12px; color: #9b84b5;
      transition: color .2s, transform .2s;
      &:hover { color: #e8cc7a; transform: rotate(90deg); }
    }

    .dialog-brand { text-align: center; margin-bottom: 16px; }
    .dialog-logo {
      width: 72px; height: 72px; object-fit: contain; border-radius: 50%;
      background: radial-gradient(circle, rgba(197, 160, 78, .12) 0%, rgba(55, 3, 111, .3) 100%);
      padding: 8px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, .4), 0 0 40px rgba(197, 160, 78, .1);
      border: 1.5px solid rgba(197, 160, 78, .3);
    }

    h2 {
      margin: 0; font-family: 'Playfair Display', Georgia, serif;
      color: #ede0c8; font-size: 1.65rem; text-align: center; letter-spacing: .5px;
    }
    .subtitle {
      margin: 6px 0 0; color: #9b84b5; font-size: .88rem; text-align: center;
      font-family: 'Cormorant Garamond', Georgia, serif; letter-spacing: .3px;
      strong { color: #c5a04e; }
    }

    .ornament { display: flex; align-items: center; gap: 12px; margin: 20px 0 24px; }
    .ornament-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(197, 160, 78, .4), transparent); }
    .ornament-icon { color: #c5a04e; font-size: 18px; width: 18px; height: 18px; }

    .login-form { display: flex; flex-direction: column; gap: 16px; }

    .field {
      display: flex; align-items: center; gap: 12px; padding: 4px 14px;
      border: 1.5px solid rgba(197, 160, 78, .25); border-radius: 12px;
      background: rgba(255, 255, 255, .06);
      transition: all .3s cubic-bezier(.4, 0, .2, 1);
      &.focused { border-color: #c5a04e; background: rgba(255, 255, 255, .1); box-shadow: 0 0 0 3px rgba(197, 160, 78, .1); }
      &.filled { border-color: rgba(197, 160, 78, .4); background: rgba(255, 255, 255, .08); }
    }
    .field-icon {
      color: #9b84b5; font-size: 20px; width: 20px; height: 20px;
      transition: color .3s;
      .focused & { color: #c5a04e; }
    }
    .field-inner {
      flex: 1; display: flex; flex-direction: column; padding: 8px 0;
      label {
        font-size: .72rem; font-weight: 600; text-transform: uppercase;
        letter-spacing: 1px; color: #9b84b5; transition: color .3s;
        .focused & { color: #c5a04e; }
      }
      input {
        border: none; outline: none; background: transparent;
        font-size: .95rem; color: #ede0c8; font-family: inherit; padding: 2px 0 0;
        &::placeholder { color: transparent; }
      }
    }

    .error {
      display: flex; align-items: center; gap: 6px; color: #ff8a80;
      font-size: .82rem; padding: 8px 12px; background: rgba(198, 40, 40, .15);
      border-radius: 8px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    /* ── OTP Boxes ── */
    .otp-container {
      display: flex; justify-content: center; gap: 10px; margin: 4px 0;
    }
    .otp-box {
      width: 48px; height: 56px; text-align: center; font-size: 1.4rem;
      font-weight: 700; color: #c5a04e; letter-spacing: 0;
      border: 1.5px solid rgba(197, 160, 78, .3); border-radius: 12px;
      background: rgba(255, 255, 255, .06); outline: none;
      font-family: 'Playfair Display', Georgia, serif;
      transition: all .2s;
      &:focus {
        border-color: #c5a04e; background: rgba(255, 255, 255, .12);
        box-shadow: 0 0 0 3px rgba(197, 160, 78, .15);
      }
    }

    .otp-timer {
      text-align: center; font-size: .82rem; color: #9b84b5; margin: 0;
      &.expired { color: #ff8a80; }
    }
    .resend-link {
      color: #c5a04e; text-decoration: none; font-weight: 600; cursor: pointer;
      &:hover { text-decoration: underline; }
      &.disabled { opacity: .5; pointer-events: none; }
    }

    /* ── Buttons ── */
    .login-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 14px; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #c5a04e 0%, #e8cc7a 50%, #c5a04e 100%);
      color: #1a0a2e; font-size: 1rem; font-weight: 700;
      font-family: 'Playfair Display', Georgia, serif; letter-spacing: .8px;
      cursor: pointer; position: relative; overflow: hidden; margin-top: 4px;
      transition: all .3s cubic-bezier(.4, 0, .2, 1);
      &::before {
        content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .3), transparent);
        transition: left .5s;
      }
      &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(197, 160, 78, .4); &::before { left: 100%; } }
      &:disabled { opacity: .6; cursor: not-allowed; }
    }

    .btn-arrow {
      font-size: 18px; width: 18px; height: 18px;
      transition: transform .3s;
      .login-btn:hover:not(:disabled) & { transform: translateX(3px); }
      &.spin { animation: spin 1s linear infinite; }
    }

    .back-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      background: none; border: 1.5px solid rgba(197, 160, 78, .2); border-radius: 10px;
      color: #9b84b5; font-size: .85rem; padding: 10px; cursor: pointer;
      transition: all .2s;
      &:hover { border-color: rgba(197, 160, 78, .5); color: #c5a04e; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ── Success ── */
    .success-content { text-align: center; padding: 16px 0; }
    .success-icon-wrap { margin-bottom: 16px; }
    .success-icon { font-size: 64px; width: 64px; height: 64px; color: #4caf50; }

    .terms {
      margin: 20px 0 0; text-align: center; font-size: .75rem;
      color: rgba(155, 132, 181, .7);
      a { color: #c5a04e; text-decoration: none; font-weight: 600; &:hover { text-decoration: underline; } }
    }

    @keyframes spin { 100% { transform: rotate(360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginDialog {
  name = '';
  email = '';
  error = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  otpIndexes = [0, 1, 2, 3, 4, 5];

  nameFocused = signal(false);
  emailFocused = signal(false);
  step = signal<'credentials' | 'otp' | 'success'>('credentials');
  loading = signal(false);
  otpCountdown = signal(300); // 5 min in seconds
  otpExpired = signal(false);
  resendCooldown = signal(0);
  successMessage = signal('');

  private countdownTimer: any;
  private resendTimer: any;

  get otpCode(): string {
    return this.otpDigits.join('');
  }

  constructor(
    private dialogRef: MatDialogRef<LoginDialog>,
    private authService: AuthService
  ) {}

  onSendOtp() {
    if (!this.name.trim() || !this.email.trim()) {
      this.error = 'Please fill in all fields.';
      return;
    }
    this.error = '';
    this.loading.set(true);

    this.authService.sendOtp(this.name.trim(), this.email.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('otp');
        this.startCountdown();
        this.startResendCooldown();
      },
      error: (err) => {
        this.loading.set(false);
        this.error = err.error?.error || 'Failed to send OTP. Please try again.';
      },
    });
  }

  onVerifyOtp() {
    const code = this.otpCode;
    if (code.length < 6) {
      this.error = 'Please enter the complete 6-digit code.';
      return;
    }
    this.error = '';
    this.loading.set(true);

    this.authService.verifyOtp(this.email.trim(), code).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.clearTimers();
        this.authService.login(res.user.name, res.user.email);
        this.successMessage.set(
          res.user.isNew
            ? 'Your account has been created successfully!'
            : 'You have signed in successfully!'
        );
        this.step.set('success');
        setTimeout(() => this.dialogRef.close(true), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error = err.error?.error || 'Verification failed. Please try again.';
      },
    });
  }

  resendOtp() {
    if (this.resendCooldown() > 0) return;
    this.otpDigits = ['', '', '', '', '', ''];
    this.error = '';
    this.loading.set(true);

    this.authService.sendOtp(this.name.trim(), this.email.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.otpExpired.set(false);
        this.startCountdown();
        this.startResendCooldown();
      },
      error: (err) => {
        this.loading.set(false);
        this.error = err.error?.error || 'Failed to resend OTP.';
      },
    });
  }

  goBack() {
    this.clearTimers();
    this.otpDigits = ['', '', '', '', '', ''];
    this.error = '';
    this.step.set('credentials');
  }

  // ── OTP input helpers ──
  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '');
    input.value = val;
    this.otpDigits[index] = val;
    if (val && index < 5) {
      setTimeout(() => {
        const next = document.getElementById('otp-' + (index + 1)) as HTMLInputElement;
        if (next) {
          next.focus();
          next.select();
        }
      });
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prev = document.getElementById('otp-' + (index - 1)) as HTMLInputElement;
      prev?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = pasted[i] || '';
    }
    const focusIdx = Math.min(pasted.length, 5);
    const el = document.getElementById('otp-' + focusIdx) as HTMLInputElement;
    el?.focus();
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Timers ──
  private startCountdown() {
    this.clearTimers();
    this.otpCountdown.set(300);
    this.otpExpired.set(false);
    this.countdownTimer = setInterval(() => {
      const val = this.otpCountdown() - 1;
      this.otpCountdown.set(val);
      if (val <= 0) {
        clearInterval(this.countdownTimer);
        this.otpExpired.set(true);
      }
    }, 1000);
  }

  private startResendCooldown() {
    this.resendCooldown.set(30);
    this.resendTimer = setInterval(() => {
      const val = this.resendCooldown() - 1;
      this.resendCooldown.set(val);
      if (val <= 0) clearInterval(this.resendTimer);
    }, 1000);
  }

  private clearTimers() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  close() {
    this.clearTimers();
    this.dialogRef.close(false);
  }
}
