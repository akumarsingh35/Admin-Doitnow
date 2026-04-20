import { Component } from '@angular/core';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: false,
})
export class ReportsPage {
  readonly title = 'Reports & Analytics';
  readonly description = 'Feature shell for reporting views, KPIs, exports, and analytical dashboards.';
}
