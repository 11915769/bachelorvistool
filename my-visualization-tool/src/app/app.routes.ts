import { Routes } from '@angular/router';
import { VisualizationComponent } from './visualization/visualization.component';

export const routes: Routes = [
  { path: '', redirectTo: 'visualization', pathMatch: 'full' }, // Redirect to visualization
  { path: 'visualization', component: VisualizationComponent }
];
