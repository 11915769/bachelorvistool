import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import * as vgplot from '@uwdata/vgplot';

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent {
  selectedFile: File | null = null;
  currentVisualization: string = 'cadence-distance'; // Default visualization
  visualizations = ['cadence-distance', 'stride-length-pace', 'correlation-heatmap', 'scatter-cadence-stride'];
  data: any = null;
  map: any  = null;
  polylines: any = null;

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.selectedFile = input.files[0];
      this.uploadFile(); // Automatically upload the file after selection
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post('http://127.0.0.1:5000/upload', formData).subscribe(
      (response: any) => {
        this.data = response.data;
        this.renderVisualization();
        this.renderMap(); // Always render the map
      },
      (error) => console.error('Error uploading file:', error)
    );
  }

  onVisualizationChange(): void {
    this.renderVisualization(); // Re-render when visualization type changes
  }

  renderVisualization(): void {
    if (!this.data) return;

    const container = document.getElementById('visualization-container');
    if (!container) return;
    container.innerHTML = ''; // Clear previous visualization

    switch (this.currentVisualization) {
      case 'cadence-distance':
        this.renderCadenceDistance(container);
        break;
      case 'stride-length-pace':
        this.renderStrideLengthPace(container);
        break;
      case 'correlation-heatmap':
        this.renderHeatmapCorrelation(container);
        break;
      case 'scatter-cadence-stride':
        this.renderScatterCadenceStride(container);
        break;
      default:
        console.error('Unknown visualization type');
    }
  }

  // Cadence vs Distance Visualization
  renderCadenceDistance(container: HTMLElement): void {
    const plot = vgplot.plot(
      vgplot.line(
        this.data.Distance.map((x: number, i: number) => ({ x, y: this.data.Cadence[i] })),
        { x: 'x', y: 'y', stroke: 'blue' }
      ),
      vgplot.width(600),
      vgplot.height(300)
    );
    container.appendChild(plot);
  }

  // Stride Length vs Pace Visualization
  renderStrideLengthPace(container: HTMLElement): void {
    const plot = vgplot.plot(
      vgplot.line(
        this.data.Pace.map((x: number, i: number) => ({ x, y: this.data.StrideLength[i] })),
        { x: 'x', y: 'y', stroke: 'green' }
      ),
      vgplot.width(600),
      vgplot.height(300)
    );
    container.appendChild(plot);
  }

  // Heatmap Correlation Visualization
  renderHeatmapCorrelation(container: HTMLElement): void {
    const metrics = ['Cadence', 'StrideLength', 'Pace', 'Power', 'HeartRate'];
    const correlations = metrics.flatMap((x) =>
      metrics.map((y) => ({
        x: x,
        y: y,
        value: this.calculateCorrelation(this.data[x], this.data[y]),
      }))
    );
    const plot = vgplot.plot(
      vgplot.cell(correlations, { x: 'x', y: 'y', fill: 'value', stroke: 'white' }),
      vgplot.width(600),
      vgplot.height(600)
    );
    container.appendChild(plot);
  }

  // Scatter: Cadence vs Stride Length
  renderScatterCadenceStride(container: HTMLElement): void {
    const scatterData = this.data.Cadence.map((cadence: number, i: number) => ({
      x: this.data.Pace[i],
      y: this.data.StrideLength[i],
      color: cadence,
    }));
    const plot = vgplot.plot(
      vgplot.dot(scatterData, { x: 'x', y: 'y', fill: 'color', stroke: 'black', r: 3 }),
      vgplot.width(600),
      vgplot.height(300)
    );
    container.appendChild(plot);
  }

  renderMap(): void {
  if (!this.data || !this.data.Latitude?.length || !this.data.Longitude?.length) {
    console.log(this.data);
    console.error("Missing positional data.");
    return;
  }

  const positions = this.data.Latitude.map((lat: number, index: number) => ({
    lat: lat,
    lng: this.data.Longitude[index],
  }));

  if (positions.length < 2) {
    console.error("Not enough positional data to draw a route.");
    return;
  }

  if (!this.map) {
  this.map = L.map("map").setView([positions[0].lat, positions[0].lng], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(this.map);
}

  this.polylines = L.polyline(positions, { color: "red" }).addTo(this.map);

  const bounds = L.latLngBounds(positions);
  this.map.fitBounds(bounds);
}

  // Utility: Correlation Calculation
  calculateCorrelation(x: number[], y: number[]): number {
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denominator = Math.sqrt(
      x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) *
      y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
    );
    return numerator / denominator;
  }
}
