import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Product } from '../../data/product-data';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly STORAGE_KEY = 'bloomora_wishlist';
  private authService = inject(AuthService);

  items = signal<Product[]>(this.loadFromStorage());

  totalItems = computed(() => this.authService.isLoggedIn() ? this.items().length : 0);

  constructor() {
    effect(() => {
      const items = this.items();
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    });
  }

  private loadFromStorage(): Product[] {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  isInWishlist(productId: string): boolean {
    return this.authService.isLoggedIn() && this.items().some(p => p.id === productId);
  }

  toggle(product: Product) {
    if (this.isInWishlist(product.id)) {
      this.remove(product.id);
    } else {
      this.add(product);
    }
  }

  add(product: Product) {
    if (!this.isInWishlist(product.id)) {
      this.items.set([...this.items(), product]);
    }
  }

  remove(productId: string) {
    this.items.set(this.items().filter(p => p.id !== productId));
  }

  clear() {
    this.items.set([]);
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}
