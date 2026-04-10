import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { AuthService } from '../../shared/services/auth.service';
import { LogoutDialog } from '../../shared/logout-dialog/logout-dialog';

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
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, Header, Footer],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfile implements OnInit {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  user = this.authService.user;
  orders = signal<Order[]>([]);
  loadingOrders = signal(true);
  activeTab = signal<'overview' | 'orders'>('overview');
  expandedOrder = signal<string | null>(null);

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

  setTab(tab: 'overview' | 'orders') {
    this.activeTab.set(tab);
  }

  toggleOrder(orderId: string) {
    this.expandedOrder.update(current => current === orderId ? null : orderId);
  }

  getInitials(): string {
    const name = this.user().name || '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  getMemberSince(): string {
    return 'April 2026';
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

  getTotalItemsPurchased(): number {
    return this.orders().reduce((sum, o) => sum + o.totalItems, 0);
  }

  getTotalSpent(): string {
    return this.orders().reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2);
  }

  getStatusClass(status: string): string {
    if (status.toLowerCase().includes('paid')) return 'status-paid';
    if (status.toLowerCase().includes('pending')) return 'status-pending';
    return 'status-default';
  }

  logout() {
    const dialogRef = this.dialog.open(LogoutDialog, {
      width: '400px',
      panelClass: 'logout-dialog-panel',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.authService.logout();
        this.router.navigate(['/']);
      }
    });
  }
}
