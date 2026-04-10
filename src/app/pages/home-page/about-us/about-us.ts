import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Header } from '../../../shared/header/header';
import { Footer } from '../../../shared/footer/footer';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [Header, Footer],
  templateUrl: './about-us.html',
  styleUrl: './about-us.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutUs {}
