import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';
import { Product } from '../../data/product-data';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../shared/services/cart.service';
import { AuthService } from '../../shared/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { LoginDialog } from '../../shared/login-dialog/login-dialog';
import { WishlistService } from '../../shared/services/wishlist.service';
import * as XLSX from 'xlsx';

interface BreadcrumbItem {
  label: string;
  link: string;
}

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, Header, Footer],
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPage {
  allProducts = signal<Product[]>([]);
  selectedCategory = signal<string | null>(null);
  selectedSubcategory = signal<string | null>(null);
  lightboxProduct = signal<Product | null>(null);
  sortBy = signal<string>('');
  products = computed<Product[]>(() => {
    let filtered = this.allProducts();
    if (this.selectedCategory()) {
      filtered = filtered.filter(p => p.category === this.selectedCategory());
    }
    if (this.selectedSubcategory()) {
      filtered = filtered.filter(p => p.subcategory === this.selectedSubcategory());
    }
    const sort = this.sortBy();
    if (sort === 'price-asc') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    } else if (sort === 'newest') {
      filtered = [...filtered].reverse();
    }
    return filtered;
  });
  categories = computed(() => Array.from(new Set(this.allProducts().map(p => p.category))).filter(Boolean));
  subcategories = computed(() => {
    if (!this.selectedCategory()) return [];
    return Array.from(new Set(this.allProducts().filter(p => p.category === this.selectedCategory()).map(p => p.subcategory))).filter(Boolean);
  });
  private cartService = inject(CartService);
  authService = inject(AuthService);
  private dialog = inject(MatDialog);
  wishlistService = inject(WishlistService);

  constructor(private http: HttpClient, private router: Router) {
    this.loadProductLists();
  }
  setCategory(category: string | null) {
    this.selectedCategory.set(category);
    this.selectedSubcategory.set(null);
    this.currentPage.set(1);
  }

  setSubcategory(subcategory: string | null) {
    this.selectedSubcategory.set(subcategory);
    this.currentPage.set(1);
  }

  setSortBy(sort: string) {
    this.sortBy.set(sort);
    this.currentPage.set(1);
  }

  loadProductLists() {
    this.http.get('product_lists.xlsx', { responseType: 'arraybuffer' })
      .subscribe({
        next: (data: ArrayBuffer) => {
          let workbook: XLSX.WorkBook | null = null;
          try {
            workbook = XLSX.read(data, { type: 'buffer' });
          } catch (e1) {
            try {
              const uint8Array = new Uint8Array(data);
              workbook = XLSX.read(uint8Array, { type: 'array' });
            } catch (e2) {
              console.error('Failed to parse Excel file:', e1, e2);
              return;
            }
          }
          if (!workbook) {
            console.error('No workbook loaded from Excel file.');
            return;
          }
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
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
        },
        error: (err) => {
          console.error('Failed to load Excel file:', err);
        }
      });
  }
  readonly quantities = signal<Record<string, number>>({});
  readonly hoveredImage = signal<Record<string, string>>({});
  readonly pageSize = 12;
  readonly currentPage = signal(1);

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.products().length / this.pageSize)));

  readonly pagedProducts = computed<Product[]>(() => {
    const page = this.currentPage();
    const products = this.products();
    const start = (page - 1) * this.pageSize;
    return products.slice(start, start + this.pageSize);
  });

  readonly pageNumbers = computed<number[]>(() => Array.from({ length: this.pageCount() }, (_, index) => index + 1));

  readonly paginationInfo = computed(() => {
    const total = this.products().length;
    const start = total === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage() * this.pageSize, total);
    return { start, end, total };
  });

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const current = this.products()[0];
    if (!current) {
      return [{ label: 'Home', link: '/' }];
    }
    return [
      { label: 'Home', link: '/' },
      { label: current.category, link: '#' },
      { label: current.subcategory, link: '#' },
    ];
  });

  openLightbox(product: Product) {
    this.lightboxProduct.set(product);
  }

  closeLightbox() {
    this.lightboxProduct.set(null);
  }

  goToProduct(product: Product) {
    this.router.navigate(['/product-details', product.id]);
  }

  getDisplayImage(product: Product): string {
    return this.hoveredImage()[product.id] || product.image || 'assets/logo.png';
  }

  setHoveredImage(product: Product, img: string) {
    this.hoveredImage.update(current => ({ ...current, [product.id]: img }));
  }

  clearHoveredImage(product: Product) {
    this.hoveredImage.update(current => ({ ...current, [product.id]: '' }));
  }

  increment(product: Product) {
    this.quantities.update(current => ({
      ...current,
      [product.id]: (current[product.id] ?? 0) + 1,
    }));
  }

  decrement(product: Product) {
    this.quantities.update(current => {
      const currentValue = current[product.id] ?? 0;
      return {
        ...current,
        [product.id]: currentValue > 0 ? currentValue - 1 : 0,
      };
    });
  }

  getQuantity(product: Product) {
    return this.quantities()[product.id] ?? 1;
  }

  setPage(page: number) {
    this.currentPage.set(page);
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(value => value - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.pageCount()) {
      this.currentPage.update(value => value + 1);
    }
  }

  requireLogin(): boolean {
    if (!this.authService.isLoggedIn()) {
      this.dialog.open(LoginDialog, {
        width: '520px',
        panelClass: 'login-dialog-panel',
      });
      return true;
    }
    return false;
  }

  addToCart(product: Product) {
    if (!this.authService.isLoggedIn()) return;
    const qty = this.getQuantity(product) || 1;
    this.cartService.addToCart(product, qty);
    this.quantities.update(current => ({ ...current, [product.id]: 0 }));
  }

  toggleWishlist(product: Product) {
    if (!this.authService.isLoggedIn()) {
      const dialogRef = this.dialog.open(LoginDialog, {
        width: '520px',
        panelClass: 'login-dialog-panel',
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.wishlistService.toggle(product);
        }
      });
      return;
    }
    this.wishlistService.toggle(product);
  }
}

