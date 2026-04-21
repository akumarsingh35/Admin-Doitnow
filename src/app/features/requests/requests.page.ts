import { Component } from '@angular/core';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
  standalone: false,
})
export class RequestsPage {
  readonly title = 'Requests & Transactions';

  readonly lead =
    'Unified intake for approvals, money movement, and escalations — built for clarity at a glance.';

  readonly stats: Array<{ label: string; value: string; hint: string; tone: 'a' | 'b' | 'c' }> = [
    { label: 'Open', value: '—', hint: 'Awaiting action', tone: 'a' },
    { label: 'Today', value: '—', hint: 'New in 24h', tone: 'b' },
    { label: 'SLA', value: '—', hint: 'On track', tone: 'c' },
  ];

  readonly workflows: Array<{
    icon: string;
    title: string;
    subtitle: string;
    orb: 'indigo' | 'violet' | 'amber' | 'emerald';
  }> = [
    {
      icon: 'git-pull-request-outline',
      title: 'Approval queue',
      subtitle: 'Service changes, refunds, and role requests',
      orb: 'indigo',
    },
    {
      icon: 'card-outline',
      title: 'Payments & settlements',
      subtitle: 'Payouts, reconciliations, and failed transactions',
      orb: 'violet',
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Customer requests',
      subtitle: 'Tickets escalated from the mobile app',
      orb: 'amber',
    },
    {
      icon: 'pulse-outline',
      title: 'Activity & audit',
      subtitle: 'Immutable log of admin actions',
      orb: 'emerald',
    },
  ];
}
