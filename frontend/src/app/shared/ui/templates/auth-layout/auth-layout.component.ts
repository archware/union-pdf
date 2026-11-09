import { Component } from '@angular/core';
import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';


@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [ScrollOverlayComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css'
})
export class AuthLayoutComponent { }
