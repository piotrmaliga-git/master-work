import { Component } from '@angular/core';

import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'root',
  imports: [RouterOutlet],
  template: `<router-outlet data-testid="app-router-outlet"></router-outlet>`,
})
export class AppComponent {}
