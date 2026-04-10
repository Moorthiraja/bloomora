import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { CartService } from '../../shared/services/cart.service';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule, Header, Footer],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage {
  cartService = inject(CartService);
  authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

  // Order state
  isLoading = signal(false);
  orderPlaced = signal(false);
  orderId = signal('');
  orderError = signal('');

  // Billing
  billingName = '';
  billingEmail = '';
  billingPhone = '';
  billingAddress = '';
  billingCity = '';
  billingState = '';
  billingPincode = '';

  // Shipping
  sameAsBilling = signal(true);
  shippingName = '';
  shippingPhone = '';
  shippingAddress = '';
  shippingCity = '';
  shippingState = '';
  shippingPincode = '';

  // Payment
  paymentMethod = signal<'cod' | 'upi' | 'card'>('cod');

  // Shipping cost
  readonly shippingCost = computed(() => this.cartService.totalPrice() >= 499 ? 0 : 50);
  readonly orderTotal = computed(() => this.cartService.totalPrice() + this.shippingCost());

  // Form valid
  readonly billingValid = computed(() => {
    return !!(
      this.billingName.trim() &&
      this.billingEmail.trim() &&
      this.billingPhone.trim() &&
      this.billingAddress.trim() &&
      this.billingCity.trim() &&
      this.billingState.trim() &&
      this.billingPincode.trim()
    );
  });

  readonly shippingValid = computed(() => {
    if (this.sameAsBilling()) return true;
    return !!(
      this.shippingName.trim() &&
      this.shippingPhone.trim() &&
      this.shippingAddress.trim() &&
      this.shippingCity.trim() &&
      this.shippingState.trim() &&
      this.shippingPincode.trim()
    );
  });

  formValid = signal(false);

  checkFormValidity() {
    const billingOk = !!(
      this.billingName.trim() &&
      this.billingEmail.trim() &&
      this.billingPhone.trim() &&
      this.billingAddress.trim() &&
      this.billingCity.trim() &&
      this.billingState.trim() &&
      this.billingPincode.trim()
    );

    let shippingOk = true;
    if (!this.sameAsBilling()) {
      shippingOk = !!(
        this.shippingName.trim() &&
        this.shippingPhone.trim() &&
        this.shippingAddress.trim() &&
        this.shippingCity.trim() &&
        this.shippingState.trim() &&
        this.shippingPincode.trim()
      );
    }

    this.formValid.set(billingOk && shippingOk);
  }

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user.isLoggedIn) {
        this.billingName = user.name;
        this.billingEmail = user.email;
        this.checkFormValidity();
      }
    });
  }

  toggleSameAsBilling() {
    this.sameAsBilling.update(v => !v);
    this.checkFormValidity();
  }

  setPaymentMethod(method: 'cod' | 'upi' | 'card') {
    this.paymentMethod.set(method);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  placeOrder() {
    if (!this.formValid() || this.isLoading()) return;

    this.isLoading.set(true);
    this.orderError.set('');

    const billing = {
      name: this.billingName.trim(),
      email: this.billingEmail.trim(),
      phone: this.billingPhone.trim(),
      address: this.billingAddress.trim(),
      city: this.billingCity.trim(),
      state: this.billingState.trim(),
      pincode: this.billingPincode.trim(),
    };

    const shipping = this.sameAsBilling()
      ? null
      : {
          name: this.shippingName.trim(),
          phone: this.shippingPhone.trim(),
          address: this.shippingAddress.trim(),
          city: this.shippingCity.trim(),
          state: this.shippingState.trim(),
          pincode: this.shippingPincode.trim(),
        };

    const items = this.cartService.items().map(item => ({
      productId: item.product.id,
      name: item.product.name,
      category: item.product.category || '',
      subcategory: item.product.subcategory || '',
      quantity: item.quantity,
      price: item.product.price,
    }));

    this.http.post<{ success: boolean; orderId: string }>('http://localhost:3000/api/orders/place', {
      billing,
      shipping,
      payment: this.paymentMethod(),
      items,
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.orderId.set(res.orderId);
        this.orderPlaced.set(true);
        this.cartService.clearCart();
      },
      error: () => {
        this.isLoading.set(false);
        this.orderError.set('Failed to place order. Please try again.');
      },
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
