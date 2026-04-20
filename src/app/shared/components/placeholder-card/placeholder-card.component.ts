import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-placeholder-card',
  templateUrl: './placeholder-card.component.html',
  styleUrls: ['./placeholder-card.component.scss'],
  standalone: false,
})
export class PlaceholderCardComponent {
  @Input() title = '';
  @Input() description = '';
}
