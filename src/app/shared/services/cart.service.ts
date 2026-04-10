import { Injectable, signal, computed, effect } from '@angular/core';
import { Product } from '../../data/product-data';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly STORAGE_KEY = 'bloomora_cart';

  items = signal<CartItem[]>(this.loadFromStorage());

  totalItems = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  constructor() {
    effect(() => {
      const items = this.items();
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    });
  }

  private loadFromStorage(): CartItem[] {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addToCart(product: Product, quantity = 1) {
    const current = this.items();
    const existing = current.find(i => i.product.id === product.id);
    if (existing) {
      this.items.set(
        current.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      );
    } else {
      this.items.set([...current, { product, quantity }]);
    }
  }

  removeFromCart(productId: string) {
    this.items.set(this.items().filter(i => i.product.id !== productId));
  }

  updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) {
      this.removeFromCart(productId);
      return;
    }
    this.items.set(
      this.items().map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      )
    );
  }

  clearCart() {
    this.items.set([]);
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}
