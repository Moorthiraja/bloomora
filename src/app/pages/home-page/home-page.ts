import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Header } from '../../shared/header/header';
import { Footer } from '../../shared/footer/footer';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [Header, Footer, RouterLink, CommonModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  particles = Array.from({ length: 18 }, (_, i) => ({
    left: `${5 + Math.round((i / 17) * 90)}%`,
    delay: `${(i * 0.7).toFixed(1)}s`,
    dur: `${3 + (i % 5)}s`,
  }));

  marqueeItems = [
    '◆ Kundan Stones',
    '◆ Crystal Beads',
    '◆ Pearl Beads',
    '◆ Jewelry Materials',
    '◆ Hair Accessories',
    '◆ Stone Beads',
    '◆ Glass Beads',
    '◆ Craft Tools',
  ];
}
