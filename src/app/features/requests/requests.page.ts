import { Component } from '@angular/core';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
  standalone: false,
})
export class RequestsPage {
  readonly title = 'Requests & Transactions';
  readonly description = 'Feature shell for transactional workflows, operational requests, and approval pipelines.';
}
