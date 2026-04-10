import { Routes } from '@angular/router';
import { HomePage } from './pages/home-page/home-page';
import { ProductPage } from './pages/product-page/product-page';
import { ProductDetails } from './pages/product-details/product-details';
import { AboutUs } from './pages/home-page/about-us/about-us';
import { CartPage } from './pages/cart/cart';
import { CheckoutPage } from './pages/checkout/checkout';
import { ContactUs } from './pages/contact-us/contact-us';
import { MyProfile } from './pages/my-profile/my-profile';
import { MyOrders } from './pages/my-orders/my-orders';
import { WishlistPage } from './pages/wishlist/wishlist';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'products',
    component: ProductPage,
  },
  {
    path: 'product-details/:id',
    component: ProductDetails,
  },
  {
    path: 'cart',
    component: CartPage,
  },
  {
    path: 'checkout',
    component: CheckoutPage,
  },
  {
    path: 'about-us',
    component: AboutUs,
  },
  {
    path: 'contact-us',
    component: ContactUs,
  },
  {
    path: 'my-profile',
    component: MyProfile,
  },
  {
    path: 'my-orders',
    component: MyOrders,
  },
  {
    path: 'wishlist',
    component: WishlistPage,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
