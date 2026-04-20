import { Component } from '@angular/core';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: false,
})
export class UsersPage {
  readonly title = 'User Management';
  readonly description = 'Feature shell for user administration flows, user lists, and profile lifecycle actions.';
}
