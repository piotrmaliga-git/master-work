import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  constructor(readonly theme: ThemeService) {}

  toggleTheme() {
    this.theme.toggleDarkMode(!this.theme.isDark());
  }
}
