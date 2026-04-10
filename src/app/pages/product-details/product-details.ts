import { Component, ChangeDetectionStrategy, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { Product } from '../../data/product-data';
import { AuthService } from '../../shared/services/auth.service';
import { LoginDialog } from '../../shared/login-dialog/login-dialog';
import { CartService } from '../../shared/services/cart.service';
import { WishlistService } from '../../shared/services/wishlist.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, Header, Footer],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetails {
  @ViewChild('relatedScroll') relatedScroll!: ElementRef<HTMLDivElement>;
  product = signal<Product | null>(null);
  allProducts = signal<Product[]>([]);
  quantity = signal(1);
  activeTab = signal<'description' | 'details' | 'reviews'>('description');
  selectedColor = signal('#f7f2fc');

  colorOptions = [
    { name: 'Default', value: '#f7f2fc' },
    { name: 'Rose', value: '#fce4ec' },
    { name: 'Sky Blue', value: '#e3f2fd' },
    { name: 'Mint', value: '#e8f5e9' },
    { name: 'Lavender', value: '#ede7f6' },
    { name: 'Peach', value: '#fff3e0' },
    { name: 'Lemon', value: '#fffde7' },
    { name: 'Coral', value: '#fbe9e7' },
  ];

  relatedProducts = computed(() => {
    const p = this.product();
    if (!p) return [];
    const all = this.allProducts().filter(item => item.id !== p.id);
    const sameSubcategory = all.filter(item => item.category === p.category && item.subcategory === p.subcategory);
    if (sameSubcategory.length >= 4) return sameSubcategory;
    const sameCategory = all.filter(item => item.category === p.category && item.subcategory !== p.subcategory);
    return [...sameSubcategory, ...sameCategory];
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog,
    private authService: AuthService,
    private cartService: CartService,
    public wishlistService: WishlistService
  ) {
    this.loadProducts();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      const found = this.allProducts().find(p => String(p.id) === String(id));
      if (found) {
        this.product.set(found);
        this.quantity.set(1);
        this.activeTab.set('description');
      }
    });
  }

  loadProducts() {
    this.http.get('product_lists.xlsx', { responseType: 'arraybuffer' })
      .subscribe({
        next: (data: ArrayBuffer) => {
          let workbook: XLSX.WorkBook | null = null;
          try {
            workbook = XLSX.read(data, { type: 'buffer' });
          } catch {
            try {
              workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
            } catch {
              return;
            }
          }
          if (!workbook) return;
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
          const products: Product[] = rows.map((row: any, idx: number) => {
            return {
              id: row.id || idx.toString(),
              name: row.name || '',
              category: row.category || '',
              subcategory: row.subcategory || '',
              price: Number(row.price) || 0,
              image: row.image ? String(row.image) : '',
            };
          });
          this.allProducts.set(products);
          const id = this.route.snapshot.paramMap.get('id');
          const found = products.find(p => String(p.id) === String(id));
          if (found) {
            this.product.set(found);
          } else {
            console.warn('Product not found for id:', id, 'Available ids:', products.map(p => p.id));
          }
        }
      });
  }

  incrementQty() {
    this.quantity.update(v => v + 1);
  }

  decrementQty() {
    this.quantity.update(v => (v > 1 ? v - 1 : 1));
  }

  setTab(tab: 'description' | 'details' | 'reviews') {
    this.activeTab.set(tab);
  }

  selectColor(color: string) {
    this.selectedColor.set(color);
  }

  getSelectedColorName(): string {
    return this.colorOptions.find(c => c.value === this.selectedColor())?.name || '';
  }

  goToProduct(product: Product) {
    this.router.navigate(['/product-details', product.id]);
    this.product.set(product);
    this.quantity.set(1);
    this.activeTab.set('description');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack() {
    this.router.navigate(['/products']);
  }

  scrollRelated(direction: 'left' | 'right') {
    const el = this.relatedScroll?.nativeElement;
    if (!el) return;
    const scrollAmount = 280;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  }

  private requireLogin(callback: () => void) {
    if (this.authService.isLoggedIn()) {
      callback();
      return;
    }
    const dialogRef = this.dialog.open(LoginDialog, {
      width: '520px',
      panelClass: 'login-dialog-panel',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) callback();
    });
  }

  addToCart() {
    this.requireLogin(() => {
      const p = this.product();
      if (p) {
        this.cartService.addToCart(p, this.quantity());
        this.router.navigate(['/cart']);
      }
    });
  }

  buyNow() {
    this.requireLogin(() => {
      const p = this.product();
      if (p) {
        this.cartService.addToCart(p, this.quantity());
        this.router.navigate(['/cart']);
      }
    });
  }

  toggleWishlist() {
    const p = this.product();
    if (!p) return;
    this.requireLogin(() => {
      this.wishlistService.toggle(p);
    });
  }
}
