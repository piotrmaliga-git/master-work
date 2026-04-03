import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule],
  template: `<div class="w-full h-full flex flex-col items-center justify-center py-24">
    <h1 class="text-5xl font-bold mb-4 text-[var(--p-primary-color)]">404</h1>
    <p
      class="text-lg mb-8 text-[var(--p-text-muted-color)]"
      i18n="notFound|Message shown on 404 page@@notFound.message"
    >
      Page not found
    </p>
    <a
      data-testid="not-found-home-link"
      routerLink="/"
      pButton
      class="p-button-text text-[var(--p-primary-color)]"
      i18n="notFound|CTA link text to return home@@notFound.goHome"
      >Go back to home</a
    >
  </div> `,
})
export class NotFoundPageComponent {}
