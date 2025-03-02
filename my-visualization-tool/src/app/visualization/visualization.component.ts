import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import * as L from 'leaflet';
import {cadenceVsStrideLength} from "./renderFunctions/cadenceVsStrideLength";
import {paceVsStrideLengthWithCadence} from "./renderFunctions/paceVsStirdeLengthWithCadence";
import {cadenceStrideLengthBoxPlot} from "./renderFunctions/cadenceStrideLengthBoxPlot";
import {ApiService} from "../api.service";
import {multiCadence} from "./renderFunctions/multiCadence";
import {cadenceHelper} from "./renderFunctions/cadenceHelper";
import {insertFilteredDataset} from "./renderFunctions/paceVsStirdeLengthWithCadence";
import {AveragePipe} from './pipes/average.pipe';
import {PaceFormatPipe} from './pipes/pace-format.pipe';
import {renderFiveGraphs} from "./renderFunctions/renderFiveGraphs";
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, FormsModule, AveragePipe, PaceFormatPipe, NgbModule],
  templateUrl: './visualization.component.html',
  styleUrls: ['./visualization.component.scss']
})
export class VisualizationComponent {
  selectedFile: File | null = null;
  currentVisualization: string = 'cadence-distance';
  data: any = null;
  map: any = null;
  polylines: any = null;
  uploadMode: 'single' | 'multi' | 'helper' = 'single';
  cadence: boolean = true;
  strideLength: boolean = true;
  pace: boolean = true;
  power: boolean = true;
  heartRate: boolean = true;
  private markers: L.Layer[] = [];
  highlightedIndex: number | null = null;
  smoothness: number = 10;
  runDate: string = "Unknown";
  runAverages: any[] = [];
  visualizationLoaded: boolean = false;


  constructor(private http: HttpClient,
              private apiService: ApiService) {
  }

  updateSmoothness(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.smoothness = parseInt(input.value, 10);
    document.getElementById('smoothness-value')!.innerText = input.value;
    this.renderVisualization();
  }

  setUploadMode(mode: 'single' | 'multi' | 'helper'): void {
    this.uploadMode = mode;
    if (this.uploadMode === 'single') {
      this.currentVisualization = 'cadence-distance';
    } else if (this.uploadMode === 'helper') {
      this.currentVisualization = 'cadence-helper';
    } else if (this.uploadMode === 'multi') {
      this.visualizationLoaded = false;
      this.currentVisualization = 'cadence-distance-multi';
    }

    const container = document.getElementById('visualization-container');
    if (container) container.innerHTML = '';
    const containerFive = document.getElementById('five-graphs');
    if (containerFive) containerFive.innerHTML = '';

    this.data = null;
  }


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input?.files?.length) {
      this.selectedFile = input.files[0];
      this.uploadFile();

      setTimeout(() => {
        input.value = "";
      }, 100);
    }
  }


  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input?.files) return;

    const files: FileList = input.files;

    if (files.length !== 2) {
      alert("Please select exactly 2 files for multi-upload.");
      input.value = "";
      return;
    }

    this.uploadFiles(files);
  }


  uploadFile(): void {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.apiService.uploadFile(formData).subscribe(response => {
        this.data = response.data;

        this.renderVisualization();
        this.renderMap();
        this.runDate = this.data.Timestamp ? new Date(this.data.Timestamp[0]).toLocaleDateString() : "Unknown";


        insertFilteredDataset(this.data).then(() => {
          console.log("SQL Data Inserted After Upload");
        }).catch(error => console.error("QL Insert Failed:", error));
      },
      (error) => console.error('Error uploading file:', error)
    );
  }


  uploadFiles(files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    this.apiService.uploadFiles(formData).subscribe(response => {
        this.data = response.results;
        this.runAverages = this.calculateRunAverages(response.results);
        this.renderVisualization();
      },
      (error) => console.error('Error uploading files:', error)
    )
  }


  onVisualizationChange(): void {
    this.renderVisualization();
    this.renderMap()
  }


  renderVisualization(): void {
    this.visualizationLoaded = false;
    const container = document.getElementById('visualization-container');
    const containerFive = document.getElementById('five-graphs');
    if (containerFive) containerFive.innerHTML = '';
    if (!container) return;
    if (!this.data) return;

    switch (this.currentVisualization) {
      case 'cadence-distance':
        cadenceVsStrideLength(
          container,
          this.data,
          this.highlightedIndex,
          this.cadence,
          this.strideLength,
          this.pace,
          this.power,
          this.heartRate,
          this.smoothness,
          (index) => this.highlightMarkerOnMap(index)
        );
        renderFiveGraphs(containerFive, this.data, this.smoothness, this.highlightedIndex, (index) => this.highlightMarkerOnMap(index)
        );
        break;
      case 'strideLength-power':
        paceVsStrideLengthWithCadence(container, this.data);
        break;
      case 'boxplot':
        cadenceStrideLengthBoxPlot(container, this.data);
        break;
      case 'cadence-distance-multi':
        multiCadence(container, this.data);
        const observer = new MutationObserver((mutationsList, observer) => {
          for (const mutation of mutationsList) {
            if (mutation.addedNodes.length > 0) {
              this.visualizationLoaded = true;
              observer.disconnect();
              break;
            }
          }
        });

        observer.observe(container, {childList: true});
        break;
      case 'cadence-helper':
        cadenceHelper(container, this.data);
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

    if (this.currentVisualization !== 'cadence-distance') {
      const mapContainer = document.getElementById("map");
      if (mapContainer) {
        mapContainer.innerHTML = '';
        mapContainer.style.backgroundColor = "";
      }
      return;
    }

    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.warn("Map container not found, skipping map rendering.");
      return;
    }

    if (this.map) {
      this.map.remove();
    }

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

    this.map = L.map("map").setView([positions[0].lat, positions[0].lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map);

    this.polylines = L.polyline(positions.map(p => [p.lat, p.lng]), {color: "red"}).addTo(this.map);

    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];

    positions.forEach((position: Position) => {
      const marker = L.circleMarker([position.lat, position.lng], {
        radius: 0.5,
        color: "#007BFF",
        fillColor: "#007BFF",
        fillOpacity: 0.8,
      }).addTo(this.map);

      this.markers.push(marker);

      marker.on("mouseover", () => {
        this.highlightMarkerOnMap(position.index);
        this.highlightPointInVisualization(position.index);
      });

      marker.on("mouseout", () => {
        this.clearHighlight();
      });
    });

    const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
    this.map.fitBounds(bounds);
  }


  highlightMarkerOnMap(index: number | null): void {
    if (!this.map || !this.markers.length) return;

    this.highlightedIndex = index;

    this.markers.forEach((marker, i) => {
      if (i === index) {
        this.map.removeLayer(marker);

        (marker as L.CircleMarker).setStyle({
          color: "red",
          fillColor: "red",
          fillOpacity: 1.0,
          radius: 6
        });

        this.map.addLayer(marker);
      } else {
        (marker as L.CircleMarker).setStyle({
          color: "#007BFF",
          fillColor: "#007BFF",
          fillOpacity: 0.8,
          radius: 0.5
        });
      }
    });

  }

  clearHighlight(): void {
    if (this.currentVisualization != 'cadence-distance') return;
    this.highlightedIndex = null;

    this.markers.forEach(marker => {
      (marker as L.CircleMarker).setStyle({color: "#007BFF", fillColor: "#007BFF", fillOpacity: 0.8, radius: 0.5});
    });

    this.renderVisualization();
  }

  highlightPointInVisualization(index: number | null): void {
    if (this.currentVisualization != 'cadence-distance') return;

    if (index !== null) {
      this.highlightedIndex = index;
    } else {
      this.highlightedIndex = null;
    }

    const container = document.getElementById("visualization-container");
    const containerFive = document.getElementById("five-graphs");
    if (!container) return;

    const visualization = this.currentVisualization === "cadence-distance"
      ? cadenceVsStrideLength
      : paceVsStrideLengthWithCadence;

    if (visualization === cadenceVsStrideLength) {
      visualization(container, this.data, this.highlightedIndex, this.cadence, this.strideLength, this.pace, this.power, this.heartRate, this.smoothness, (index: number | null) => {
        this.clearHighlight();
        this.highlightMarkerOnMap(index);
      });
      renderFiveGraphs(containerFive, this.data, this.smoothness, this.highlightedIndex, (index) => this.highlightMarkerOnMap(index));
    }
  }

  calculateRunAverages(runs: any[]): any[] {
    return runs.map(run => {
      return {
        filename: run.filename,
        cadence: this.calculateAverage(run.data.Cadence),
        strideLength: this.calculateAverage(run.data.StrideLength),
        power: this.calculateAverage(run.data.Power),
        pace: this.calculateAverage(run.data.Pace),
        heartRate: this.calculateAverage(run.data.HeartRate),
        timestamp: run.data.Timestamp,
        distance: Math.max(...run.data.Distance),
        elevation: run.data.Elevation.reduce((sum: number, curr: number, i: number, arr: number[]) => {
          if (i > 0 && curr > arr[i - 1]) {
            sum += curr - arr[i - 1];
          }
          return sum;
        }, 0),
      };
    });
  }

  calculateAverage(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getRunDate(timestamps: string[]): string {
    if (!timestamps || timestamps.length === 0) return "Unknown";

    const validTimestamps = timestamps
      .map(t => new Date(t).getTime())
      .filter(t => !isNaN(t));

    if (validTimestamps.length === 0) return "Unknown";

    const earliestTimestamp = new Date(Math.min(...validTimestamps));
    return earliestTimestamp.toLocaleDateString("de-DE");
  }

  getTitle(visualization: any): string {
    switch (this.currentVisualization) {
      case "cadence-distance":
        return "Cadence vs Stride Length vs Pace vs Power vs Heart Rate";
      case "strideLength-power":
        return "Dynamic Scatter Plot with Selection";
      case "cadence-distance-multi":
        return "Comparison between two runs";
      case "cadence-helper":
        return "Cadence Helper ";
    }
    return visualization.name;
  }
}


