import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { AuthService } from '../../shared/services/auth.service';
import { WishlistService } from '../../shared/services/wishlist.service';
import { CartService } from '../../shared/services/cart.service';
import { LoginDialog } from '../../shared/login-dialog/login-dialog';
import { Product } from '../../data/product-data';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, Header, Footer],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistPage {
  wishlistService = inject(WishlistService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  get items() {
    return this.wishlistService.items();
  }

  removeItem(productId: string) {
    this.wishlistService.remove(productId);
  }

  addToCart(product: Product) {
    if (!this.authService.isLoggedIn()) {
      const dialogRef = this.dialog.open(LoginDialog, {
        width: '520px',
        panelClass: 'login-dialog-panel',
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.cartService.addToCart(product, 1);
        }
      });
      return;
    }
    this.cartService.addToCart(product, 1);
  }

  moveToCart(product: Product) {
    this.addToCart(product);
    this.wishlistService.remove(product.id);
  }

  moveAllToCart() {
    if (!this.authService.isLoggedIn()) {
      const dialogRef = this.dialog.open(LoginDialog, {
        width: '520px',
        panelClass: 'login-dialog-panel',
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.items.forEach(p => this.cartService.addToCart(p, 1));
          this.wishlistService.clear();
        }
      });
      return;
    }
    this.items.forEach(p => this.cartService.addToCart(p, 1));
    this.wishlistService.clear();
  }

  clearWishlist() {
    this.wishlistService.clear();
  }

  goToProduct(product: Product) {
    this.router.navigate(['/product-details', product.id]);
  }
}
