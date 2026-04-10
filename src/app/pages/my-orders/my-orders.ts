import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { AuthService } from '../../shared/services/auth.service';

interface OrderItem {
  productId: string;
  name: string;
  category: string;
  subcategory: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  orderId: string;
  orderDate: string;
  totalItems: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  items: OrderItem[];
}

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, Header, Footer],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrders implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  user = this.authService.user;
  orders = signal<Order[]>([]);
  loadingOrders = signal(true);
  expandedOrder = signal<string | null>(null);
  searchQuery = signal('');
  filterStatus = signal<'all' | 'paid' | 'pending'>('all');

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }
    this.loadOrders();
  }

  loadOrders() {
    this.loadingOrders.set(true);
    const email = this.user().email;
    this.http.get<{ orders: Order[] }>(`http://localhost:3000/api/orders?email=${encodeURIComponent(email)}`)
      .subscribe({
        next: (res) => {
          this.orders.set(res.orders || []);
          this.loadingOrders.set(false);
        },
        error: () => {
          this.orders.set([]);
          this.loadingOrders.set(false);
        },
      });
  }

  get filteredOrders(): Order[] {
    let result = this.orders();
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(o =>
        o.orderId.includes(query) ||
        o.orderDate.toLowerCase().includes(query) ||
        o.items.some(i => i.name.toLowerCase().includes(query))
      );
    }
    const status = this.filterStatus();
    if (status === 'paid') {
      result = result.filter(o => o.status.toLowerCase().includes('paid'));
    } else if (status === 'pending') {
      result = result.filter(o => o.status.toLowerCase().includes('pending'));
    }
    return result;
  }

  toggleOrder(orderId: string) {
    this.expandedOrder.update(current => current === orderId ? null : orderId);
  }

  getPaymentIcon(method: string): string {
    if (method === 'cod') return 'money';
    if (method === 'upi') return 'qr_code_2';
    return 'credit_card';
  }

  getPaymentLabel(method: string): string {
    if (method === 'cod') return 'Cash on Delivery';
    if (method === 'upi') return 'UPI Payment';
    return 'Card Payment';
  }

  getStatusClass(status: string): string {
    if (status.toLowerCase().includes('paid')) return 'status-paid';
    if (status.toLowerCase().includes('pending')) return 'status-pending';
    return 'status-default';
  }

  getTotalSpent(): number {
    return this.orders().reduce((sum, o) => sum + o.totalAmount, 0);
  }

  getTotalItems(): number {
    return this.orders().reduce((sum, o) => sum + o.totalItems, 0);
  }

  setFilter(status: 'all' | 'paid' | 'pending') {
    this.filterStatus.set(status);
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}
