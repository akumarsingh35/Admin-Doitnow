import { Component } from '@angular/core';

@Component({
  selector: 'app-partners',
  templateUrl: './partners.page.html',
  styleUrls: ['./partners.page.scss'],
  standalone: false,
})
export class PartnersPage {
  readonly title = 'Partners Management';
  readonly description = 'Feature shell for partner administration flows, partner lists, and profile lifecycle actions.';
}
