import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { PlaceholderCardComponent } from './components/placeholder-card/placeholder-card.component';

@NgModule({
  declarations: [PlaceholderCardComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, IonicModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    IonicModule,
    PlaceholderCardComponent,
  ],
})
export class SharedModule {}
