import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, Header, Footer],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactUs {
  private http = inject(HttpClient);

  name = '';
  email = '';
  phone = '';
  subject = '';
  message = '';

  isLoading = signal(false);
  submitted = signal(false);
  errorMsg = signal('');

  formValid = signal(false);

  checkFormValidity() {
    this.formValid.set(
      !!(this.name.trim() && this.email.trim() && this.subject.trim() && this.message.trim())
    );
  }

  submitForm() {
    if (!this.formValid() || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMsg.set('');

    this.http.post<{ success: boolean }>('http://localhost:3000/api/contact', {
      name: this.name.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      subject: this.subject.trim(),
      message: this.message.trim(),
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMsg.set('Failed to send message. Please try again.');
      },
    });
  }

  resetForm() {
    this.name = '';
    this.email = '';
    this.phone = '';
    this.subject = '';
    this.message = '';
    this.submitted.set(false);
    this.errorMsg.set('');
    this.formValid.set(false);
  }
}
