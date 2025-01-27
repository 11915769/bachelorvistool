import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import * as L from 'leaflet';
import {cadenceVsStrideLength} from "./renderFunctions/cadenceVsStrideLength";
import {paceVsStrideLengthWithCadence} from "./renderFunctions/paceVsStirdeLengthWithCadence";

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.css']
})
export class VisualizationComponent {
  selectedFile: File | null = null;
  currentVisualization: string = 'cadence-distance';
  data: any = null;
  map: any = null;
  polylines: any = null;

  constructor(private http: HttpClient) {
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.selectedFile = input.files[0];
      this.uploadFile();
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
        this.renderMap();
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
    container.innerHTML = '';

    switch (this.currentVisualization) {
      case 'cadence-distance':
        cadenceVsStrideLength(container, this.data);
        break;
      case 'strideLength-power':
        paceVsStrideLengthWithCadence(container, this.data);
        break;
      default:
        console.error('Unknown visualization type');
    }
  }


  renderMap(): void {
    if (!this.data || !this.data.Latitude?.length || !this.data.Longitude?.length) {
      console.error("Missing positional data.");
      return;
    }

    // Define the type for positions
    type Position = { lat: number; lng: number; index: number };

    const positions: Position[] = this.data.Latitude.map((lat: number, index: number) => ({
      lat: lat,
      lng: this.data.Longitude[index],
      index: index,
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

    // Remove existing polylines and markers if they exist
    if (this.polylines) {
      this.map.removeLayer(this.polylines);
    }

    // Add polyline for the route
    this.polylines = L.polyline(positions.map(p => [p.lat, p.lng]), {color: "red"}).addTo(this.map);

    // Add markers with hover events
    positions.forEach((position: Position) => {
      const marker = L.circleMarker([position.lat, position.lng], {
        radius: 2,
        color: "#007BFF",
        fillColor: "#007BFF",
        fillOpacity: 0.8,
      }).addTo(this.map);

      marker.on("mouseover", () => {
        this.highlightPointInVisualization(position.index);
      });

      marker.on("mouseout", () => {
        this.highlightPointInVisualization(null);
      });
    });

    const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
    this.map.fitBounds(bounds);
  }

  highlightPointInVisualization(index: number | null): void {
  const container = document.getElementById("visualization-container");
  if (!container) return;

  const visualization = this.currentVisualization === "cadence-distance"
    ? cadenceVsStrideLength
    : paceVsStrideLengthWithCadence;

  visualization(container, this.data, index);
}

}
