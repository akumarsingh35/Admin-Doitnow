import { Component } from '@angular/core';

export interface PartnerWorker {
  id: string;
  name: string;
  role: string;
  zone: string;
  rating: number;
  reviewCount: number;
  description: string;
  completedJobs: number;
  tone: 'indigo' | 'violet' | 'amber';
}

@Component({
  selector: 'app-partners',
  templateUrl: './partners.page.html',
  styleUrls: ['./partners.page.scss'],
  standalone: false,
})
export class PartnersPage {
  readonly title = 'Partners Management';

  readonly lead =
    'Browse field partners and workers in your network. Sample profiles below are placeholder data for UI review.';

  readonly stats: Array<{ label: string; value: string; hint: string; tone: 'a' | 'b' | 'c' }> = [
    { label: 'Workers', value: '8', hint: 'In directory', tone: 'a' },
    { label: 'Avg. rating', value: '4.8', hint: 'Out of 5', tone: 'b' },
    { label: 'Jobs done', value: '1.2k+', hint: 'All-time (sample)', tone: 'c' },
  ];

  /** Dummy worker profiles for layout preview */
  readonly workers: PartnerWorker[] = [
    {
      id: '1',
      name: 'Ananya Sharma',
      role: 'Lead technician · HVAC',
      zone: 'North Mumbai',
      rating: 4.9,
      reviewCount: 214,
      description:
        'Certified installer with 9+ years on commercial and residential cooling systems. Known for clean handoffs and same-day diagnostics.',
      completedJobs: 186,
      tone: 'indigo',
    },
    {
      id: '2',
      name: 'Rahul Menon',
      role: 'Electrician · Industrial',
      zone: 'Pune West',
      rating: 4.7,
      reviewCount: 156,
      description:
        'Handles heavy wiring audits and safety sign-offs. Preferred for factory floor upgrades and preventive maintenance windows.',
      completedJobs: 142,
      tone: 'violet',
    },
    {
      id: '3',
      name: 'Priya Iyer',
      role: 'Plumbing specialist',
      zone: 'Bengaluru Central',
      rating: 5.0,
      reviewCount: 302,
      description:
        'Emergency leak response and bathroom remodels. Maintains a near-perfect on-time record for scheduled visits.',
      completedJobs: 268,
      tone: 'amber',
    },
    {
      id: '4',
      name: 'Vikram Patel',
      role: 'Carpentry & interiors',
      zone: 'Ahmedabad',
      rating: 4.6,
      reviewCount: 89,
      description:
        'Custom shelving, modular kitchens, and finishing work. Brings detailed quotes and milestone-based milestones.',
      completedJobs: 97,
      tone: 'indigo',
    },
    {
      id: '5',
      name: 'Sneha Kulkarni',
      role: 'Painter · Premium finishes',
      zone: 'Thane',
      rating: 4.8,
      reviewCount: 178,
      description:
        'Low-VOC coatings and texture work for offices and homes. Coordinates with designers for color-matched batches.',
      completedJobs: 155,
      tone: 'violet',
    },
    {
      id: '6',
      name: 'Arjun Desai',
      role: 'Appliance repair',
      zone: 'Surat',
      rating: 4.5,
      reviewCount: 64,
      description:
        'Washing machines, refrigerators, and small appliances. Stocks common parts to reduce return visits.',
      completedJobs: 71,
      tone: 'amber',
    },
    {
      id: '7',
      name: 'Meera Joshi',
      role: 'Deep cleaning lead',
      zone: 'Mumbai Suburbs',
      rating: 4.9,
      reviewCount: 421,
      description:
        'Post-construction and move-in packages. Trains junior crews on checklist quality and client communication.',
      completedJobs: 312,
      tone: 'indigo',
    },
    {
      id: '8',
      name: 'Karthik Nair',
      role: 'Smart home · Low voltage',
      zone: 'Hyderabad',
      rating: 4.7,
      reviewCount: 93,
      description:
        'Camera, doorbell, and Wi-Fi mesh installs. Documents network maps for handover to IT teams.',
      completedJobs: 88,
      tone: 'violet',
    },
  ];

  readonly starSlots = [1, 2, 3, 4, 5] as const;

  trackByWorkerId(_index: number, w: PartnerWorker): string {
    return w.id;
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  starIcon(rating: number, slot: number): string {
    if (rating >= slot) {
      return 'star';
    }
    if (rating >= slot - 0.5) {
      return 'star-half-outline';
    }
    return 'star-outline';
  }
}
