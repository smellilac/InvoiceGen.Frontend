import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from './shared/footer';
import { CookieConsent } from './shared/cookie-consent';

@Component({
  imports: [RouterOutlet, Footer, CookieConsent],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
