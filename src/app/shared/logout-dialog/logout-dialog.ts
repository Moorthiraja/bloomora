import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-logout-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="logout-dialog">
      <!-- Decorative top accent -->
      <div class="dialog-accent"></div>

      <!-- Close button -->
      <button class="close-btn" mat-icon-button (click)="cancel()">
        <mat-icon>close</mat-icon>
      </button>

      <!-- Icon -->
      <div class="dialog-icon-wrap">
        <div class="icon-ring">
          <mat-icon class="dialog-main-icon">logout</mat-icon>
        </div>
      </div>

      <h2>Leaving So Soon?</h2>
      <p class="subtitle">You'll need to sign in again to access your cart, wishlist &amp; exclusive offers.</p>

      <!-- User info card -->
      <div class="user-card">
        <div class="user-avatar">{{ userInitial }}</div>
        <div class="user-info">
          <span class="user-name">{{ authService.user().name }}</span>
          <span class="user-email">{{ authService.user().email }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button class="btn-stay" (click)="cancel()">
          <mat-icon>favorite</mat-icon>
          Stay Signed In
        </button>
        <button class="btn-logout" (click)="confirmLogout()">
          <mat-icon>logout</mat-icon>
          Sign Out
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .logout-dialog {
      padding: 40px 36px 32px;
      position: relative;
      min-width: 440px;
      background: linear-gradient(165deg, #0d0618 0%, #180036 30%, #37036f 60%, #1a0a2e 100%);
      text-align: center;
      overflow: hidden;
    }

    /* Top accent */
    .dialog-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #c5a04e, #e8cc7a, #c5a04e);
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      color: #9b84b5;
      transition: color .2s, transform .2s;
      &:hover {
        color: #e8cc7a;
        transform: rotate(90deg);
      }
    }

    /* Icon */
    .dialog-icon-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }

    .icon-ring {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(197, 160, 78, .12), rgba(55, 3, 111, .3));
      border: 2px solid rgba(197, 160, 78, .35);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px rgba(197, 160, 78, .1);
    }

    .dialog-main-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #c5a04e;
    }

    h2 {
      margin: 0;
      font-family: 'Playfair Display', Georgia, serif;
      color: #ede0c8;
      font-size: 1.5rem;
      letter-spacing: .5px;
    }

    .subtitle {
      margin: 8px 0 0;
      color: #9b84b5;
      font-size: .88rem;
      font-family: 'Cormorant Garamond', Georgia, serif;
      line-height: 1.5;
      letter-spacing: .2px;
    }

    /* User card */
    .user-card {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 24px 0;
      padding: 14px 16px;
      background: rgba(255, 255, 255, .06);
      border: 1.5px solid rgba(197, 160, 78, .2);
      border-radius: 14px;
      text-align: left;
    }

    .user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c5a04e, #e8cc7a);
      color: #1a0a2e;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.2rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .user-name {
      font-size: .95rem;
      font-weight: 600;
      color: #ede0c8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: .8rem;
      color: #9b84b5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Actions */
    .dialog-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .btn-stay {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #c5a04e 0%, #e8cc7a 50%, #c5a04e 100%);
      color: #1a0a2e;
      font-size: .95rem;
      font-weight: 700;
      font-family: 'Playfair Display', Georgia, serif;
      letter-spacing: .8px;
      cursor: pointer;
      transition: all .3s cubic-bezier(.4, 0, .2, 1);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .3), transparent);
        transition: left .5s;
      }
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 28px rgba(197, 160, 78, .4);
        &::before { left: 100%; }
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .btn-logout {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      border: 1.5px solid rgba(197, 160, 78, .25);
      border-radius: 12px;
      background: transparent;
      color: #9b84b5;
      font-size: .9rem;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: all .25s;

      &:hover {
        border-color: #ff8a80;
        color: #ff8a80;
        background: rgba(198, 40, 40, .1);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutDialog {
  authService = inject(AuthService);

  get userInitial(): string {
    return this.authService.user().name?.charAt(0)?.toUpperCase() || '?';
  }

  constructor(private dialogRef: MatDialogRef<LogoutDialog>) {}

  confirmLogout() {
    this.authService.logout();
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
