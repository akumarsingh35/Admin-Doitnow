import { Component } from '@angular/core';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.page.html',
  styleUrls: ['./roles.page.scss'],
  standalone: false,
})
export class RolesPage {
  readonly title = 'Role & Permission Management';
  readonly description = 'Feature shell for managing authorization rules, roles, and permission mappings.';
}
