import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { WishlistService } from '../services/wishlist.service';
import { LoginDialog } from '../login-dialog/login-dialog';
import { LogoutDialog } from '../logout-dialog/logout-dialog';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);

  user = this.authService.user;

  isExpanded = signal(false);
  isMobileMenuOpen = signal(false);

  toggleExpand() {
    this.isExpanded.update(value => !value);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(value => !value);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  logout() {
    this.dialog.open(LogoutDialog, { width: '520px', panelClass: 'logout-dialog-panel' });
  }

  login() {
    this.dialog.open(LoginDialog, { width: '520px', panelClass: 'login-dialog-panel' });
  }
}
