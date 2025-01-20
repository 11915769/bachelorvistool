import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { VisualizationComponent } from './visualization/visualization.component';

export const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'visualization', component: VisualizationComponent }
];
