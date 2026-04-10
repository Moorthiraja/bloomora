import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { CartService } from '../../shared/services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, Header, Footer],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  cartService = inject(CartService);
  private router = inject(Router);

  readonly pageSize = 5;
  readonly currentPage = signal(1);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.cartService.items().length / this.pageSize)));
  readonly pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.cartService.items().slice(start, start + this.pageSize);
  });
  readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  readonly paginationInfo = computed(() => {
    const total = this.cartService.items().length;
    const start = total === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return { start, end, total };
  });
  readonly shippingCost = computed(() => this.cartService.totalPrice() >= 499 ? 0 : 50);
  readonly orderTotal = computed(() => this.cartService.totalPrice() + this.shippingCost());

  goBack() {
    this.router.navigate(['/products']);
  }

  removeItem(productId: string) {
    this.cartService.removeFromCart(productId);
    if (this.currentPage() > this.pageCount()) {
      this.currentPage.set(this.pageCount());
    }
  }

  incrementQty(productId: string, currentQty: number) {
    this.cartService.updateQuantity(productId, currentQty + 1);
  }

  decrementQty(productId: string, currentQty: number) {
    this.cartService.updateQuantity(productId, currentQty - 1);
  }

  clearCart() {
    this.cartService.clearCart();
    this.currentPage.set(1);
  }

  setPage(page: number) {
    this.currentPage.set(page);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(v => v - 1);
  }

  nextPage() {
    if (this.currentPage() < this.pageCount()) this.currentPage.update(v => v + 1);
  }
}
